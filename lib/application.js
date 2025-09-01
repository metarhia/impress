'use strict';

const { node, npm, metarhia, wt } = require('./deps.js');
const { parentPort, threadId, workerData } = wt;
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

const UserApplication = class Application extends EventEmitter {};

const { COMMON_CONTEXT } = metarhia.metavm;
const ERRORS = { Error, DomainError };
const NAMESPACES = { node, npm, metarhia, process };
const SANDBOX = { ...COMMON_CONTEXT, ...ERRORS, ...NAMESPACES };

const ERR_INIT = 'Can not initialize an Application';
const ERR_TEST = 'Application tests failed';
const TEST_DELAY = 100;

class Application extends EventEmitter {
  constructor() {
    super();
    this.kind = workerData.kind;
    this.initialization = true;
    this.finalization = false;
    this.root = workerData.root;
    this.path = workerData.path;
    this.test = { passed: 0, failed: 0 };
    this.mode = process.env.MODE || 'prod';

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

  async load({ invoke }) {
    this.startWatch();
    this.createSandbox();
    this.sandbox.application.invoke = invoke;
    this.sandbox.application.emit('loading');
    await this.parallel([
      this.static.load(),
      this.resources.load(),
      this.cert.load(),
      (async () => {
        await this.schemas.load();
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
    await this.start();
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
    this.semaphore = new Semaphore({ concurrency, size, timeout });
    this.initialization = false;
    sandbox.application.emit('started');
    if (mode === 'test' && threadId === 1) this.runTests();
  }

  async runTests() {
    const { test, tests, config, console } = this;
    const timer = setTimeout(() => {
      console.error('🔴 Test execution timed out');
      parentPort.postMessage({ name: 'terminate', code: 1 });
    }, config.server.timeouts.test);
    await node.events.once(this, 'ready');
    const cases = tests.map((t) => node.test(t.name, t.run));
    await this.parallel(cases, ERR_TEST);
    await metarhia.metautil.delay(TEST_DELAY);
    clearTimeout(timer);
    const { passed, failed } = test;
    const msg = `Passed ${passed}, Failed: ${failed}`;
    if (failed > 0) console.error('🔴 ' + msg);
    else console.debug('🟢 ' + msg);
    const code = failed === 0 ? 0 : 1;
    parentPort.postMessage({ name: 'terminate', code });
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
    const application = new UserApplication();
    const introspect = async (units) => this.introspect(units);
    const data = { worker, server, resources, schemas, scheduler, introspect };
    Object.assign(application, data);
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
