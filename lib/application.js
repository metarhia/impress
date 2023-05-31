'use strict';

const { node, npm, metarhia } = require('./dependencies.js');
const path = require('node:path');
const events = require('node:events');
const fs = require('node:fs');
const wt = require('node:worker_threads');
const { MessageChannel, parentPort, threadId, workerData } = wt;
const metautil = require('metautil');
const metavm = require('metavm');
const metawatch = require('metawatch');
const { Interfaces } = require('./interfaces.js');
const { Modules } = require('./modules.js');
const { Resources } = require('./resources.js');
const { Schemas } = require('./schemas.js');
const scheduler = require('./scheduler.js');
const auth = require('./auth.js');

class Error extends global.Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const invoke = async ({ method, args, exclusive = false }) => {
  const { port1: port, port2 } = new MessageChannel();
  const data = { method, args };
  const msg = { name: 'invoke', exclusive, data, port };
  return new Promise((resolve, reject) => {
    port2.on('message', ({ error, data }) => {
      if (error) reject(error);
      else resolve(data);
    });
    parentPort.postMessage(msg, [port]);
  });
};

class UserApplication extends events.EventEmitter {
  constructor(app, data) {
    super();
    Object.assign(this, data);
    this.introspect = async (interfaces) => app.introspect(interfaces);
    this.invoke = invoke;
  }
}

const SANDBOX = { ...metavm.COMMON_CONTEXT, Error, node, npm, metarhia };

const ERR_INIT = 'Can not initialize an Application';

class Application extends events.EventEmitter {
  constructor() {
    super();
    this.kind = workerData.kind;
    this.initialization = true;
    this.finalization = false;
    this.root = workerData.root;
    this.path = workerData.path;

    this.schemas = new Schemas('schemas', this);
    this.static = new Resources('static', this);
    this.cert = new Resources('cert', this);
    this.resources = new Resources('resources', this);
    this.api = new Interfaces('api', this);
    this.lib = new Modules('lib', this);
    this.db = new Modules('db', this);
    this.bus = new Modules('bus', this);
    this.domain = new Modules('domain', this);

    this.starts = [];
    this.Application = Application;
    this.Error = Error;
    this.config = null;
    this.logger = null;
    this.console = null;
    this.auth = null;
    this.watcher = null;
  }

  absolute(relative) {
    return path.join(this.path, relative);
  }

  async parallel(promises, errorMessage = ERR_INIT) {
    const results = await Promise.allSettled(promises);
    const errors = results.filter(({ status }) => status === 'rejected');
    if (errors.length > 0) {
      for (const { reason } of errors) this.console.error(reason);
      throw new Error(errorMessage);
    }
  }

  async init() {
    this.startWatch();
    this.createSandbox();
    this.sandbox.application.emit('loading');
    await this.parallel([
      this.schemas.load(),
      this.static.load(),
      this.cert.load(),
      this.resources.load(),
      (async () => {
        await this.lib.load();
        await this.db.load();
        await this.bus.load();
        await this.domain.load();
      })(),
    ]);
    this.sandbox.application.emit('loaded');
    await this.parallel(this.starts.map((fn) => this.execute(fn)));
    this.starts = [];
    this.sandbox.application.emit('started');
    await this.api.load();
    const { api } = this.sandbox;
    if (api.auth) {
      const provider = api.auth.provider || auth(this.config.sessions);
      this.auth = provider;
      api.auth.provider = provider;
    }
    this.initialization = false;
    this.sandbox.application.emit('initialized');
  }

  async shutdown() {
    this.finalization = true;
    await this.stopPlace('domain');
    await this.stopPlace('db');
    await this.stopPlace('lib');
    if (this.server) await this.server.close();
    if (this.logger) await this.logger.close();
  }

  async stopPlace(name) {
    if (!this.sandbox) return;
    const place = this.sandbox[name];
    for (const moduleName of Object.keys(place)) {
      const module = place[moduleName];
      if (typeof module.stop === 'function') await this.execute(module.stop);
    }
  }

  createSandbox() {
    const { config, console, resources, schemas } = this;
    const { server: { host, port, protocol } = {} } = this;
    const worker = { id: 'W' + threadId.toString() };
    const server = { host, port, protocol };
    const userAppData = { worker, server, resources, schemas, scheduler };
    const application = new UserApplication(this, userAppData);
    const sandbox = { ...SANDBOX, console, application, config, process };
    sandbox.api = {};
    sandbox.lib = this.lib.tree;
    sandbox.db = this.db.tree;
    sandbox.bus = this.bus.tree;
    sandbox.domain = this.domain.tree;
    this.sandbox = metavm.createContext(sandbox);
  }

  getMethod(iname, ver, methodName) {
    const iface = this.api.collection[iname];
    if (!iface) return null;
    const version = ver === '*' ? iface.default : parseInt(ver, 10);
    const methods = iface[version.toString()];
    if (!methods) return null;
    const proc = methods[methodName];
    if (!proc) return null;
    return proc;
  }

  getHook(iname) {
    const iface = this.api.collection[iname];
    if (!iface) return null;
    const hook = iface[iface.default];
    if (!hook) return null;
    return hook.router;
  }

  execute(method) {
    return method().catch((error) => {
      const msg = `Failed to execute method: ${error?.message}`;
      this.console.error(msg, error.stack);
      return Promise.reject(error);
    });
  }

  startWatch() {
    const timeout = this.config.server.timeouts.watch;
    this.watcher = new metawatch.DirectoryWatcher({ timeout });

    this.watcher.on('change', (filePath) => {
      const relPath = filePath.substring(this.path.length + 1);
      const sepIndex = relPath.indexOf(path.sep);
      const place = relPath.substring(0, sepIndex);
      fs.stat(filePath, (error, stat) => {
        if (error) return;
        if (stat.isDirectory()) {
          this[place].load(filePath);
          return;
        }
        if (threadId === 1) this.console.debug('Reload: /' + relPath);
        this[place].change(filePath);
      });
    });

    this.watcher.on('delete', async (filePath) => {
      const relPath = filePath.substring(this.path.length + 1);
      const sepIndex = relPath.indexOf(path.sep);
      const place = relPath.substring(0, sepIndex);
      this[place].delete(filePath);
      if (threadId === 1) this.console.debug('Deleted: /' + relPath);
    });
  }

  introspect(interfaces) {
    const intro = {};
    for (const interfaceName of interfaces) {
      const [iname, ver = '*'] = interfaceName.split('.');
      const iface = this.api.collection[iname];
      if (!iface) continue;
      const version = ver === '*' ? iface.default : parseInt(ver, 10);
      intro[iname] = this.api.signatures[iname + '.' + version];
    }
    return intro;
  }

  serveStatic(url, transport) {
    const [urlPath, params] = metautil.split(url, '?');
    const folder = urlPath.endsWith('/');
    const filePath = urlPath + (folder ? 'index.html' : '');
    const fileExt = metautil.fileExt(filePath);
    const data = this.static.get(filePath);
    if (data) {
      transport.write(data, 200, fileExt);
      return;
    }
    if (!folder && this.static.get(urlPath + '/index.html')) {
      const query = params ? '?' + params : '';
      transport.redirect(urlPath + '/' + query);
      return;
    }
    transport.error(404);
  }
}

module.exports = new Application();
