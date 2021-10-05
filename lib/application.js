'use strict';

const { node, npm, metarhia } = require('./dependencies.js');
const path = require('path');
const events = require('events');
const fs = require('fs');
const { MessageChannel, parentPort, threadId } = require('worker_threads');
const metavm = require('metavm');
const metawatch = require('metawatch');
const metautil = require('metautil');
const { Interfaces } = require('./interfaces.js');
const { Modules } = require('./modules.js');
const { Resources } = require('./resources.js');
const { Schemas } = require('./schemas.js');
const { Scheduler } = require('./scheduler.js');
const auth = require('./auth.js');

class Error extends global.Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const SANDBOX = { ...metavm.COMMON_CONTEXT, Error, node, npm, metarhia };

class Application extends events.EventEmitter {
  constructor() {
    super();
    this.kind = '';
    this.initialization = true;
    this.finalization = false;
    this.root = process.cwd();
    this.path = path.join(this.root, 'application');

    this.schemas = new Schemas('schemas', this);
    this.static = new Resources('static', this);
    this.resources = new Resources('resources', this);
    this.api = new Interfaces('api', this);
    this.lib = new Modules('lib', this);
    this.db = new Modules('db', this);
    this.domain = new Modules('domain', this);
    this.scheduler = new Scheduler(this);

    this.starts = [];
    this.Application = Application;
    this.Error = Error;
    this.cert = null;
    this.config = null;
    this.logger = null;
    this.console = null;
    this.auth = null;
    this.watcher = null;
  }

  absolute(relative) {
    return path.join(this.path, relative);
  }

  async init(kind) {
    this.kind = kind;
    this.startWatch();
    this.createSandbox();
    await Promise.allSettled([
      this.schemas.load(),
      this.static.load(),
      this.resources.load(),
      (async () => {
        await this.lib.load();
        await this.db.load();
        await this.domain.load();
      })(),
    ]);
    await Promise.allSettled(this.starts.map((fn) => this.execute(fn)));
    await this.api.load();
    if (kind === 'scheduler') await this.scheduler.load();
    const { api } = this.sandbox;
    if (api.auth) {
      const { provider } = api.auth;
      if (provider) {
        this.auth = provider;
      } else {
        const provider = auth(this.config.sessions);
        this.auth = provider;
        api.auth.provider = provider;
      }
    }
    this.starts = [];
    this.initialization = false;
  }

  async shutdown() {
    this.finalization = true;
    await this.stopPlace('domain');
    await this.stopPlace('db');
    await this.stopPlace('lib');
    if (this.server) await this.server.close();
    await this.logger.close();
  }

  async stopPlace(name) {
    const place = this.sandbox[name];
    for (const moduleName of Object.keys(place)) {
      const module = place[moduleName];
      if (module.stop) await this.execute(module.stop);
    }
  }

  createSandbox() {
    const { config, console, resources, schemas, scheduler } = this;
    const { server: { host, port, protocol } = {} } = this;
    const worker = { id: 'W' + threadId.toString() };
    const server = { host, port, protocol };
    const application = { worker, server, resources, schemas, scheduler };
    application.introspect = async (interfaces) => this.introspect(interfaces);
    application.invoke = async (call) => this.invoke(call);
    const sandbox = { ...SANDBOX, console, application, config, process };
    sandbox.api = {};
    sandbox.lib = this.lib.tree;
    sandbox.db = this.db.tree;
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
    return method().catch((err) => {
      this.console.error(err.stack);
    });
  }

  startWatch() {
    const timeout = this.config.server.timeouts.watch;
    this.watcher = new metawatch.DirectoryWatcher({ timeout });

    this.watcher.on('change', (filePath) => {
      const relPath = filePath.substring(this.path.length + 1);
      const sepIndex = relPath.indexOf(path.sep);
      const place = relPath.substring(0, sepIndex);
      fs.stat(filePath, (err, stat) => {
        if (err) return;
        if (stat.isDirectory()) {
          this[place].load(filePath);
          return;
        }
        if (threadId === 1) {
          this.console.debug('Reload: /' + relPath);
        }
        this[place].change(filePath);
      });
    });

    this.watcher.on('delete', async (filePath) => {
      const relPath = filePath.substring(this.path.length + 1);
      const sepIndex = relPath.indexOf(path.sep);
      const place = relPath.substring(0, sepIndex);
      this[place].delete(filePath);
      if (threadId === 1) {
        this.console.debug('Deleted: /' + relPath);
      }
    });
  }

  introspect(interfaces) {
    const intro = {};
    for (const interfaceName of interfaces) {
      const [iname, ver = '*'] = interfaceName.split('.');
      const iface = this.api.collection[iname];
      if (!iface) continue;
      const version = ver === '*' ? iface.default : parseInt(ver);
      intro[iname] = this.api.signatures[iname + '.' + version];
    }
    return intro;
  }

  getStaticFile(fileName) {
    return this.static.get(fileName);
  }

  async invoke({ method, args, exclusive = false }) {
    const { port1: port, port2 } = new MessageChannel();
    const data = { method, args };
    const msg = { type: 'invoke', name: 'request', exclusive, data, port };
    return new Promise((resolve, reject) => {
      port2.on('message', ({ error, data }) => {
        if (error) reject(error);
        else resolve(data);
      });
      parentPort.postMessage(msg, [port]);
    });
  }
}

const application = new Application();

if (parentPort) {
  parentPort.on('message', async ({ type, name, exclusive, data, port }) => {
    if (type !== 'invoke' || name !== 'request') return;
    const { method, args } = data;
    const handler = metautil.namespaceByPath(application.sandbox, method);
    if (!handler) {
      port.postMessage({ error: new Error('Handler not found') });
      return;
    }
    try {
      const result = await handler(args);
      port.postMessage({ data: result });
    } catch (err) {
      port.postMessage({ error: err });
      application.console.error(err.stack);
    } finally {
      parentPort.postMessage({ type: 'invoke', name: 'done', exclusive });
    }
  });
}

module.exports = application;
