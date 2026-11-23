'use strict';

const { node, npm, metarhia, wt } = require('./deps.js');
const { threadId, workerData } = wt;
const { Error, DomainError, Semaphore } = metarhia.metautil;
const { EventEmitter } = node.events;
const { Server, Listener } = metarhia.metacom;
const { Balancer } = require('./balancer.js');
const { DirectoryWatcher } = metarhia.metawatch;
const { Api } = require('./api.js');
const { Code } = require('./code.js');
const { Static } = require('./static.js');
const { Cert } = require('./cert.js');
const { Schemas } = require('./schemas.js');
const scheduler = require('./scheduler.js');
const { peer } = require('./link.js');
const auth = require('./auth.js');

const UserApplication = class Application extends EventEmitter {
  constructor(record) {
    super();
    this.worker = record.worker;
    this.server = record.server;
    this.resources = record.resources;
    this.schemas = record.schemas;
    this.scheduler = record.scheduler;
    this.introspect = record.introspect;
    this.invoke = null;
  }
};

const { COMMON_CONTEXT } = metarhia.metavm;
const ERRORS = { Error, DomainError };
const NAMESPACES = { node, npm, metarhia, process };
const SANDBOX = { ...COMMON_CONTEXT, ...ERRORS, ...NAMESPACES };

const ERR_INIT = 'Can not initialize an Application';
const ERR_TEST = 'Application tests failed';
const TEST_DELAY = 100;

const terminate = (code) => {
  const sent = peer.call('thread', 'terminate', { code });
  return sent.catch(() => undefined);
};

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
    this.listener = null;
    this.providers = [];
    this.servers = [];
    this.onStaticRequest = null;
    this.onWatchChange = null;
    this.onWatchDelete = null;
    this.onWatchBefore = null;
  }

  absolute(relative) {
    return node.path.join(this.path, relative);
  }

  async parallel(promises, errorMessage = ERR_INIT) {
    const results = await Promise.allSettled(promises);
    const errors = results.filter((result) => result.status === 'rejected');
    if (errors.length > 0) {
      for (let i = 0; i < errors.length; i++) {
        this.console.error(errors[i].reason);
      }
      throw new Error(errorMessage);
    }
  }

  async load({ invoke }) {
    const kind = this.kind;
    const thread = workerData.thread;
    const isWorker = kind === 'worker';
    const isServer = kind === 'server' && thread && thread.application;
    if (!isWorker && !isServer) {
      if (thread && thread.tls) {
        this.startWatch();
        await this.cert.load();
      }
      await this.start();
      return;
    }
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
    const { sandbox, config, mode } = this;
    const thread = workerData.thread;
    const kind = this.kind;
    if (sandbox && sandbox.api.auth) {
      const provider = sandbox.api.auth.provider || auth(config.sessions);
      this.auth = provider;
      sandbox.api.auth.provider = provider;
    }
    const network = config.network;
    const queue = thread && thread.queue ? thread.queue : network.queue;
    this.semaphore = new Semaphore(queue);
    if (kind === 'balancer') await this.#listenBalancers(thread);
    else if (kind === 'server') await this.#listenServers(thread);
    this.initialization = false;
    if (sandbox) sandbox.application.emit('started');
    const shouldRunTests = mode === 'test' && thread && thread.runTests;
    if (shouldRunTests) this.runTests();
  }

  async runTests() {
    const { test, tests, config, console } = this;
    const timer = setTimeout(() => {
      console.error('🔴 Test execution timed out');
      terminate(1);
    }, config.lifecycle.test);
    await node.events.once(this, 'ready');
    const cases = tests.map((item) => node.test(item.name, item.run));
    await this.parallel(cases, ERR_TEST);
    await metarhia.metautil.delay(TEST_DELAY);
    clearTimeout(timer);
    const { passed, failed } = test;
    const msg = `Passed ${passed}, Failed: ${failed}`;
    if (failed > 0) console.error(`🔴 ${msg}`);
    else console.debug(`🟢 ${msg}`);
    const code = failed === 0 ? 0 : 1;
    terminate(code);
  }

  async shutdown() {
    this.finalization = true;
    if (this.watcher) {
      if (this.onWatchChange) this.watcher.off('change', this.onWatchChange);
      if (this.onWatchDelete) this.watcher.off('delete', this.onWatchDelete);
      if (this.onWatchBefore) this.watcher.off('before', this.onWatchBefore);
      this.watcher.close();
    }
    await this.domain.stop();
    await this.db.stop();
    await this.lib.stop();
    const providers = this.providers;
    for (let i = 0; i < providers.length; i++) {
      await providers[i].stop();
    }
    if (this.server && this.onStaticRequest && this.server.httpServer) {
      this.server.httpServer.off('request', this.onStaticRequest);
    }
    if (this.listener) await this.listener.close();
    const servers = this.servers;
    for (let i = 0; i < servers.length; i++) {
      await servers[i].close();
    }
    if (this.logger) await this.logger.close();
  }

  #secureContext(servername) {
    const found = this.cert.contextFor(servername);
    if (!found) return null;
    return found.creds;
  }

  #bindStatic(server) {
    this.onStaticRequest = (req, res) => {
      const isApi = req.url.startsWith('/api');
      if (!isApi) this.static.serve(req.url, req, res);
    };
    server.httpServer.on('request', this.onStaticRequest);
  }

  #providerContext(thread, item) {
    const group = thread.group;
    const index = item.index;
    const count = item.count;
    return {
      console: this.console,
      mode: this.mode,
      protocols: thread.protocols,
      thread: { group, index, count },
    };
  }

  async #startProviders(thread, handlers) {
    const listed = thread.providers ?? [];
    const from = node.path.join(this.root, 'package.json');
    const load = node.module.createRequire(from);
    for (let i = 0; i < listed.length; i++) {
      const item = listed[i];
      const provider = load(item.name);
      const section = this.config[item.name];
      const options = section ?? {};
      const context = this.#providerContext(thread, item);
      const handler = await provider.start(options, context);
      this.providers.push(handler);
      const ids = item.protocols;
      for (let j = 0; j < ids.length; j++) handlers[ids[j]] = handler;
    }
  }

  #openApplication(thread) {
    const options = {
      host: thread.host,
      protocol: 'http',
      nagle: thread.nagle,
      timeouts: thread.timeouts,
      cors: thread.cors ?? undefined,
    };
    const server = new Server(this, options);
    this.#bindStatic(server);
    return server;
  }

  async #listenServers(thread) {
    const handlers = {};
    await this.#startProviders(thread, handlers);
    if (thread.application) {
      const server = this.#openApplication(thread);
      handlers['http/1.1'] = server;
      handlers.h2 = server;
      this.server = server;
      this.servers = [server];
    }
    const secureContext = (servername) => this.#secureContext(servername);
    const listener = new Listener({
      host: thread.host,
      ports: thread.ports,
      transports: thread.transports,
      protocols: thread.protocols,
      tls: thread.tls,
      domains: thread.domains ?? [],
      secureContext,
      handlers,
      nagle: thread.nagle,
      timeouts: thread.timeouts,
      console: this.console,
    });
    await listener.listen();
    this.listener = listener;
    const ports = thread.ports;
    for (let i = 0; i < ports.length; i++) {
      this.console.info(`Listen port ${ports[i]}`);
    }
  }

  async #listenBalancers(thread) {
    const target = thread.target;
    const targetPorts = target ? target.ports : [];
    const protocol = target ? target.protocol : 'http';
    const redirect = thread.redirect;
    const servers = [];
    const ownPorts = thread.ports;
    for (let i = 0; i < ownPorts.length; i++) {
      const port = ownPorts[i];
      const options = {
        host: thread.host,
        port,
        ports: targetPorts,
        protocol,
        redirect,
        cors: thread.cors ?? {},
        timeouts: thread.timeouts,
        nagle: thread.nagle,
      };
      const server = new Balancer(this, options);
      await server.listen();
      servers.push(server);
    }
    this.servers = servers;
    this.server = servers[0] || null;
  }

  createSandbox() {
    const { config, console, resources, schemas } = this;
    const thread = workerData.thread;
    const hasHost = thread && thread.host !== undefined;
    const host = hasHost ? thread.host : '';
    const port = thread && thread.ports ? thread.ports[0] : undefined;
    const protocol = thread && thread.tls ? 'https' : 'http';
    const worker = { id: `W${threadId}` };
    const server = { host, port, protocol };
    const introspect = async (units) => this.introspect(units);
    const record = {
      worker,
      server,
      resources,
      schemas,
      scheduler,
      introspect,
    };
    const application = new UserApplication(record);
    const sandbox = { ...SANDBOX, console, application, config };
    sandbox.api = {};
    sandbox.lib = this.lib.tree;
    sandbox.db = this.db.tree;
    sandbox.bus = this.bus.tree;
    sandbox.domain = this.domain.tree;
    sandbox.schemas = this.schemas.model;
    this.sandbox = metarhia.metavm.createContext(sandbox);
  }

  #getUnit(name, ver) {
    const unit = this.api.collection[name];
    if (!unit) return null;
    const version = ver === '*' ? unit.default : parseInt(ver, 10);
    return { unit, version };
  }

  getMethod(name, ver, methodName) {
    const found = this.#getUnit(name, ver);
    if (!found) return null;
    return found.unit[found.version]?.[methodName] || null;
  }

  execute(method, ...args) {
    return method(...args).catch((error) => {
      const msg = `Failed to execute method: ${error?.message}`;
      this.console.error(msg, error.stack);
      return Promise.reject(error);
    });
  }

  #resolvePlace(filePath) {
    const relPath = filePath.substring(this.path.length + 1);
    const sepIndex = relPath.indexOf(node.path.sep);
    const place = relPath.substring(0, sepIndex);
    return { relPath, target: this[place] };
  }

  startWatch() {
    const timeout = this.config.lifecycle.watch;
    this.watcher = new DirectoryWatcher({ timeout });
    const logError = (error) => {
      this.console.error(error.stack);
    };

    this.onWatchChange = (filePath) => {
      const { relPath, target } = this.#resolvePlace(filePath);
      if (!target) return;
      node.fs.stat(filePath, (error, stat) => {
        if (error) return;
        if (stat.isDirectory()) {
          return void target.load(filePath).catch(logError);
        }
        if (threadId === 1) this.console.debug(`Reload: /${relPath}`);
        return void target.change(filePath).catch(logError);
      });
    };

    this.onWatchDelete = async (filePath) => {
      const { relPath, target } = this.#resolvePlace(filePath);
      if (!target) return;
      target.delete(filePath);
      if (threadId === 1) this.console.debug(`Deleted: /${relPath}`);
    };

    this.onWatchBefore = async (changes) => {
      const certPath = node.path.join(this.path, 'cert');
      const changed = changes.filter((change) => {
        const name = change[0];
        return name.startsWith(certPath);
      });
      if (changed.length === 0) return;
      await this.cert.before(changed);
    };

    this.watcher.on('change', this.onWatchChange);
    this.watcher.on('delete', this.onWatchDelete);
    this.watcher.on('before', this.onWatchBefore);
  }

  introspect(units) {
    const intro = {};
    for (let i = 0; i < units.length; i++) {
      const unitName = units[i];
      const parts = unitName.split('.');
      const name = parts[0];
      const ver = parts[1] ?? '*';
      const found = this.#getUnit(name, ver);
      if (!found) continue;
      intro[name] = this.api.signatures[`${name}.${found.version}`];
    }
    return intro;
  }
}

module.exports = new Application();
