'use strict';

const { node, npm, metarhia, wt } = require('./deps.js');
const { MessageChannel, parentPort, threadId, workerData } = wt;
const { Error, DomainError, Semaphore } = metarhia.metautil;
const { EventEmitter } = node.events;
const { Server } = metarhia.metacom;
const { DirectoryWatcher } = metarhia.metawatch;
const { Api } = require('./api.js');
const { Code } = require('./code.js');
const { Static } = require('./static.js');
const { Cert } = require('./cert.js');
const { Schemas } = require('./schemas.js');
const scheduler = require('./scheduler.js');
const auth = require('./auth.js');

const invoke = async ({ method, args, exclusive = false }) => {
  const { port1: port, port2 } = new MessageChannel();
  const data = { method, args };
  const msg = { name: 'invoke', exclusive, data, port };
  return new Promise((resolve, reject) => {
    port2.on('message', ({ error, data }) => {
      port2.close();
      if (error) reject(error);
      else resolve(data);
    });
    parentPort.postMessage(msg, [port]);
  });
};

const UserApplication = class Application extends EventEmitter {
  constructor(app, data) {
    super();
    Object.assign(this, data);
    this.introspect = async (units) => app.introspect(units);
    this.invoke = invoke;
  }
};

const { COMMON_CONTEXT } = metarhia.metavm;
const ERRORS = { Error, DomainError };
const NAMESPACES = { node, npm, metarhia, process };
const POLY = { fetch: metarhia.metautil.fetch };
const SANDBOX = { ...COMMON_CONTEXT, ...ERRORS, ...NAMESPACES, ...POLY };

const ERR_INIT = 'Can not initialize an Application';
const ERR_TEST = 'Application tests failed';

class Application extends EventEmitter {
  constructor() {
    super();
    this.kind = workerData.kind;
    this.initialization = true;
    this.finalization = false;
    this.root = workerData.root;
    this.path = workerData.path;

    this.schemas = new Schemas('schemas', this);
    this.static = new Static('static', this);
    this.cert = new Cert('cert', this, { ext: ['pem', 'domains'] });
    this.resources = new Static('resources', this);
    this.api = new Api('api', this);
    this.lib = new Code('lib', this);
    this.db = new Code('db', this);
    this.bus = new Code('bus', this);
    this.domain = new Code('domain', this);

    this.starts = [];
    this.tests = [];
    this.config = null;
    this.logger = null;
    this.console = null;
    this.auth = null;
    this.watcher = null;
    this.semaphore = null;
    this.server = null;
    this.mode = process.env.MODE || 'prod';
  }

  absolute(relative) {
    return node.path.join(this.path, relative);
  }

  async parallel(promises, errorMessage = ERR_INIT) {
    const results = await Promise.allSettled(promises);
    const errors = results.filter(({ status }) => status === 'rejected');
    if (errors.length > 0) {
      for (const { reason } of errors) this.console.error(reason);
      throw new Error(errorMessage);
    }
  }

  async load() {
    this.startWatch();
    this.createSandbox();
    this.sandbox.application.emit('loading');
    await this.parallel([
      this.schemas.load(),
      this.static.load(),
      this.resources.load(),
      this.cert.load(),
      (async () => {
        await this.lib.load();
        await this.db.load();
        await this.bus.load();
        await this.domain.load();
      })(),
    ]);
    await this.parallel(this.starts.map((fn) => this.execute(fn)));
    this.starts = [];
    await this.api.load();
    this.sandbox.application.emit('loaded');
  }

  async start() {
    const { sandbox, config, cert, mode } = this;
    const { kind, port } = workerData;
    if (kind === 'server' || kind === 'balancer') {
      const options = { ...config.server, port, kind };
      if (config.server.protocol === 'https') {
        options.SNICallback = (servername, callback) => {
          const domain = cert.get(servername);
          if (!domain) callback(new Error(`No certificate for ${servername}`));
          else callback(null, domain.creds);
        };
      }
      this.server = new Server(this, options);
      await this.server.listen();
    }
    if (sandbox.api.auth) {
      const provider = sandbox.api.auth.provider || auth(config.sessions);
      this.auth = provider;
      sandbox.api.auth.provider = provider;
    }
    const { concurrency, size, timeout } = config.server.queue;
    this.semaphore = new Semaphore(concurrency, size, timeout);
    if (mode === 'test' && threadId === 1) this.test();
    this.initialization = false;
    sandbox.application.emit('started');
  }

  async test() {
    setTimeout(async () => {
      await this.parallel(
        this.tests.map((test) =>
          node.test(test.name, (t) => this.execute(test.run, t)),
        ),
        ERR_TEST,
      );
      process.kill(process.pid, 'SIGINT');
    }, 1000);
  }

  async shutdown() {
    this.finalization = true;
    await this.domain.stop();
    await this.db.stop();
    await this.lib.stop();
    if (this.server) await this.server.close();
    if (this.logger) await this.logger.close();
  }

  createSandbox() {
    const { config, console, resources, schemas } = this;
    const { server: { host, protocol } = {} } = config;
    const worker = { id: 'W' + threadId.toString() };
    const server = { host, port: workerData.port, protocol };
    const userAppData = { worker, server, resources, schemas, scheduler };
    const application = new UserApplication(this, userAppData);
    const sandbox = { ...SANDBOX, console, application, config };
    sandbox.api = {};
    sandbox.lib = this.lib.tree;
    sandbox.db = this.db.tree;
    sandbox.bus = this.bus.tree;
    sandbox.domain = this.domain.tree;
    sandbox.schemas = this.schemas.model;
    this.sandbox = metarhia.metavm.createContext(sandbox);
  }

  getMethod(name, ver, methodName) {
    const unit = this.api.collection[name];
    if (!unit) return null;
    const version = ver === '*' ? unit.default : parseInt(ver, 10);
    const methods = unit[version.toString()];
    if (!methods) return null;
    const proc = methods[methodName];
    if (!proc) return null;
    return proc;
  }

  getHook(name) {
    const unit = this.api.collection[name];
    if (!unit) return null;
    const hook = unit[unit.default];
    if (!hook) return null;
    return hook.router;
  }

  execute(method, ...args) {
    return method(...args).catch((error) => {
      const msg = `Failed to execute method: ${error?.message}`;
      this.console.error(msg, error.stack);
      return Promise.reject(error);
    });
  }

  startWatch() {
    const timeout = this.config.server.timeouts.watch;
    this.watcher = new DirectoryWatcher({ timeout });

    this.watcher.on('change', (filePath) => {
      const relPath = filePath.substring(this.path.length + 1);
      const sepIndex = relPath.indexOf(node.path.sep);
      const place = relPath.substring(0, sepIndex);
      node.fs.stat(filePath, (error, stat) => {
        if (error) return;
        if (stat.isDirectory()) return void this[place].load(filePath);
        if (threadId === 1) this.console.debug('Reload: /' + relPath);
        this[place].change(filePath);
      });
    });

    this.watcher.on('delete', async (filePath) => {
      const relPath = filePath.substring(this.path.length + 1);
      const sepIndex = relPath.indexOf(node.path.sep);
      const place = relPath.substring(0, sepIndex);
      this[place].delete(filePath);
      if (threadId === 1) this.console.debug('Deleted: /' + relPath);
    });

    this.watcher.on('before', async (changes) => {
      const certPath = node.path.join(this.path, 'cert');
      const changed = changes.filter(([name]) => name.startsWith(certPath));
      if (changed.length === 0) return;
      await this.cert.before(changes);
    });
  }

  introspect(units) {
    const intro = {};
    for (const unitName of units) {
      const [name, ver = '*'] = unitName.split('.');
      const unit = this.api.collection[name];
      if (!unit) continue;
      const version = ver === '*' ? unit.default : parseInt(ver, 10);
      intro[name] = this.api.signatures[name + '.' + version];
    }
    return intro;
  }
}

module.exports = new Application();
