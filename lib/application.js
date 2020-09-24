'use strict';

const { node, npm } = require('./dependencies.js');
const { path, events, vm, fs, fsp } = node;
const { common } = npm;

const security = require('./security.js');

const SCRIPT_OPTIONS = { timeout: 5000 };
const EMPTY_CONTEXT = Object.freeze({});
const MODULE = 2;

class Application extends events.EventEmitter {
  constructor() {
    super();
    this.initialization = true;
    this.finalization = false;
    this.namespaces = ['db'];
    this.api = {};
    this.static = new Map();
    this.root = process.cwd();
    this.path = path.join(this.root, 'application');
    this.apiPath = path.join(this.path, 'api');
    this.libPath = path.join(this.path, 'lib');
    this.domainPath = path.join(this.path, 'domain');
    this.staticPath = path.join(this.path, 'static');
    this.starts = [];
  }

  async init() {
    this.createSandbox();
    await Promise.allSettled([
      this.loadPlace('static', this.staticPath),
      this.loadPlace('api', this.apiPath),
      (async () => {
        await this.loadPlace('lib', this.libPath);
        await this.loadPlace('domain', this.domainPath);
      })(),
    ]);
    await Promise.allSettled(this.starts.map(fn => fn()));
    this.starts = null;
    this.initialization = true;
  }

  async shutdown() {
    this.finalization = true;
    await this.stopPlace('domain');
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
    const { config, namespaces, server: { host, port, protocol } = {} } = this;
    const introspect = async interfaces => this.introspect(interfaces);
    const worker = { id: 'W' + node.worker.threadId.toString() };
    const server = { host, port, protocol };
    const application = { security, introspect, worker, server };
    const api = {};
    const lib = {};
    const domain = {};
    for (const name of namespaces) application[name] = this[name];
    const sandbox = {
      Buffer, URL, URLSearchParams, Error: this.Error, console: this.console,
      application, node, npm, api, lib, domain, config,
      setTimeout, setImmediate, setInterval,
      clearTimeout, clearImmediate, clearInterval,
    };
    this.sandbox = vm.createContext(sandbox);
  }

  sandboxInject(name, module) {
    this[name] = Object.freeze(module);
    this.namespaces.push(name);
  }

  async createScript(fileName) {
    try {
      const code = await fsp.readFile(fileName, 'utf8');
      if (!code) return null;
      const src = '\'use strict\';\ncontext => ' + code;
      const options = { filename: fileName, lineOffset: -1 };
      const script = new vm.Script(src, options);
      return script.runInContext(this.sandbox, SCRIPT_OPTIONS);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.logger.error(err.stack);
      }
      return null;
    }
  }

  getMethod(iname, ver, methodName, context) {
    const iface = this.api[iname];
    if (!iface) return null;
    const version = ver === '*' ? iface.default : parseInt(ver);
    const methods = iface[version.toString()];
    if (!methods) return null;
    const method = methods[methodName];
    if (!method) return null;
    const exp = method(context);
    return typeof exp === 'object' ? exp : { access: 'logged', method: exp };
  }

  async loadMethod(fileName) {
    const rel = fileName.substring(this.apiPath.length + 1);
    if (!rel.includes('/')) return;
    const [interfaceName, methodFile] = rel.split('/');
    if (!methodFile.endsWith('.js')) return;
    const name = path.basename(methodFile, '.js');
    const [iname, ver] = interfaceName.split('.');
    const version = parseInt(ver, 10);
    const script = await this.createScript(fileName);
    if (!script) return;
    let iface = this.api[iname];
    const { api } = this.sandbox;
    let internalInterface = api[iname];
    if (!iface) {
      this.api[iname] = iface = { default: version };
      api[iname] = internalInterface = {};
    }
    let methods = iface[ver];
    if (!methods) iface[ver] = methods = {};
    methods[name] = script;
    internalInterface[name] = script(EMPTY_CONTEXT);
    if (version > iface.default) iface.default = version;
  }

  async loadModule(fileName) {
    const rel = fileName.substring(this.path.length + 1);
    if (!rel.endsWith('.js')) return;
    const script = await this.createScript(fileName);
    const name = path.basename(rel, '.js');
    const namespaces = rel.split(path.sep);
    namespaces[namespaces.length - 1] = name;
    const exp = script ? script(EMPTY_CONTEXT) : null;
    const container = typeof exp === 'function' ? { method: exp } : exp;
    const iface = {};
    if (container !== null) {
      const methods = Object.keys(container);
      for (const method of methods) {
        const fn = container[method];
        if (typeof fn === 'function') {
          container[method] = iface[method] = fn.bind(container);
        }
      }
    }
    let level = this.sandbox;
    const last = namespaces.length - 1;
    for (let depth = 0; depth <= last; depth++) {
      const namespace = namespaces[depth];
      let next = level[namespace];
      if (next) {
        if (depth === MODULE && namespace === 'stop') {
          if (exp === null && level.stop) await this.execute(level.stop);
        }
      } else {
        next = depth === last ? iface : {};
        level[namespace] = iface.method || iface;
        container.parent = level;
        if (depth === MODULE && namespace === 'start') {
          this.starts.push(iface.method);
        }
      }
      level = next;
    }
  }

  async execute(fn) {
    try {
      await fn();
    } catch (err) {
      this.logger.error(err.stack);
    }
  }

  async loadFile(filePath) {
    const key = filePath.substring(this.staticPath.length);
    try {
      const data = await fsp.readFile(filePath);
      this.static.set(key, data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.logger.error(err.stack);
      }
    }
  }

  async loadPlace(place, placePath) {
    const files = await fsp.readdir(placePath, { withFileTypes: true });
    for (const file of files) {
      if (file.name.startsWith('.')) continue;
      const filePath = path.join(placePath, file.name);
      if (file.isDirectory()) await this.loadPlace(place, filePath);
      else if (place === 'api') await this.loadMethod(filePath);
      else if (place === 'static') await this.loadFile(filePath);
      else await this.loadModule(filePath);
    }
    this.watch(place, placePath);
  }

  watch(place, placePath) {
    fs.watch(placePath, async (event, fileName) => {
      if (fileName.startsWith('.')) return;
      const filePath = path.join(placePath, fileName);
      try {
        const stat = await node.fsp.stat(filePath);
        if (stat.isDirectory()) {
          this.loadPlace(place, filePath);
          return;
        }
      } catch {
        return;
      }
      if (node.worker.threadId === 1) {
        const relPath = filePath.substring(this.path.length);
        this.logger.debug('Reload: ' + relPath);
      }
      if (place === 'api') this.loadMethod(filePath);
      else if (place === 'static') this.loadFile(filePath);
      else this.loadModule(filePath);
    });
  }

  introspect(interfaces) {
    const intro = {};
    for (const interfaceName of interfaces) {
      const [iname, ver = '*'] = interfaceName.split('.');
      const iface = this.api[iname];
      if (!iface) continue;
      const version = ver === '*' ? iface.default : parseInt(ver);
      const methods = iface[version.toString()];
      const methodNames = Object.keys(methods);
      const interfaceMethods = intro[iname] = {};
      for (const methodName of methodNames) {
        const exp = methods[methodName](EMPTY_CONTEXT);
        const fn = typeof exp === 'object' ? exp.method : exp;
        const src = fn.toString();
        const signature = common.between(src, '({', '})');
        if (signature === '') {
          interfaceMethods[methodName] = [];
          continue;
        }
        const args = signature.split(',').map(s => s.trim());
        interfaceMethods[methodName] = args;
      }
    }
    return intro;
  }

  getStaticFile(fileName) {
    return this.static.get(fileName);
  }
}

const application = new Application();

application.Error = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
};

module.exports = application;
