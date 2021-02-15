'use strict';

const { node, npm, metarhia } = require('./dependencies.js');
const { path, events, fs, fsp } = node;
const { metautil, metavm } = metarhia;
const { Schema } = require('./schema.js');

const EMPTY_CONTEXT = Object.freeze({});
const MODULE = 2;
const win = process.platform === 'win32';

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
    this.initialization = true;
    this.finalization = false;
    this.api = {};
    this.signatures = {};
    this.static = new Map();
    this.resources = new Map();
    this.root = process.cwd();
    this.path = path.join(this.root, 'application');
    this.apiPath = path.join(this.path, 'api');
    this.libPath = path.join(this.path, 'lib');
    this.domainPath = path.join(this.path, 'domain');
    this.staticPath = path.join(this.path, 'static');
    this.resourcesPath = path.join(this.path, 'resources');
    this.starts = [];
    this.Application = Application;
    this.Error = Error;
    this.cert = null;
    this.config = null;
    this.logger = null;
    this.console = null;
    this.auth = null;
  }

  async init() {
    this.createSandbox();
    await Promise.allSettled([
      this.loadPlace('static', this.staticPath),
      this.loadPlace('resources', this.resourcesPath),
      this.loadPlace('api', this.apiPath),
      (async () => {
        await this.loadPlace('lib', this.libPath);
        await this.loadPlace('domain', this.domainPath);
      })(),
    ]);
    await Promise.allSettled(this.starts.map((fn) => this.execute(fn)));
    this.starts = [];
    this.initialization = false;
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
      if (module.stop) await this.execute({ method: module.stop });
    }
  }

  createSandbox() {
    const { auth, config, console, resources } = this;
    const { server: { host, port, protocol } = {} } = this;
    const worker = { id: 'W' + node.worker.threadId.toString() };
    const server = { host, port, protocol };
    const application = { worker, server, auth, resources };
    application.introspect = async (interfaces) => this.introspect(interfaces);
    const sandbox = { ...SANDBOX, console, application, config };
    sandbox.api = {};
    sandbox.lib = {};
    sandbox.domain = {};
    this.sandbox = metavm.createContext(sandbox);
  }

  async createScript(fileName) {
    try {
      const code = await fsp.readFile(fileName, 'utf8');
      if (!code) return null;
      const src = 'context => ' + code;
      const options = { context: this.sandbox };
      const { exports } = new metavm.MetaScript(fileName, src, options);
      return exports;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.console.error(err.stack);
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
    if (!rel.includes(path.sep)) return;
    const [interfaceName, methodFile] = rel.split(path.sep);
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
    const exp = script(EMPTY_CONTEXT);
    internalInterface[name] = exp;
    this.cacheSignature(iname + '.' + version, name, exp);
    if (version > iface.default) iface.default = version;
  }

  cacheSignature(interfaceName, methodName, exp) {
    let interfaceMethods = this.signatures[interfaceName];
    if (!interfaceMethods) {
      interfaceMethods = {};
      this.signatures[interfaceName] = interfaceMethods;
    }
    interfaceMethods[methodName] = this.getSignature(exp);
  }

  getSignature(exp) {
    const fn = typeof exp === 'object' ? exp.method : exp;
    const src = fn.toString();
    const signature = metautil.between(src, '({', '})');
    if (signature === '') return [];
    return signature.split(',').map((s) => s.trim());
  }

  addModule(namespaces, exports, iface) {
    let level = this.sandbox;
    const last = namespaces.length - 1;
    for (let depth = 0; depth <= last; depth++) {
      const namespace = namespaces[depth];
      let next = level[namespace];
      if (next) {
        if (depth === MODULE && namespace === 'stop') {
          if (iface === null && level.stop) this.execute({ method: level.stop });
        }
      } else {
        if (depth === last) {
          next = iface.method || iface;
          exports.parent = level;
        } else {
          next = {};
        }
        level[namespace] = next;
        if (depth === MODULE && namespace === 'start') {
          this.starts.push(iface);
        }
      }
      level = next;
    }
  }

  async loadModule(fileName) {
    const rel = fileName.substring(this.path.length + 1);
    if (!rel.endsWith('.js')) return;
    const name = path.basename(rel, '.js');
    const namespaces = rel.split(path.sep);
    namespaces[namespaces.length - 1] = name;
    const options = { context: this.sandbox, filename: fileName };
    try {
      const script = await metavm.readScript(fileName, options);
      let exports = script.exports;
      if (typeof exports === 'function') exports = { method: exports };
      const iface = metautil.makePrivate(exports);
      this.addModule(namespaces, exports, iface);
    } catch (err) {
      this.console.error(err.stack);
    }
  }

  async execute(proc, args = {}) {
    if (proc.parameters) {
      const schema = Schema.from(proc.parameters);
      if (!schema.check(args).valid) throw new Error('Invalid parameters');
    }
    const result = await proc.method(args).catch((err) => {
      this.console.error(err.stack);
    });
    if (result instanceof Error) throw result;
    if (proc.returns) {
      const schema = Schema.from(proc.returns);
      if (!schema.check(result).valid) throw new Error('Invalid result');
    }
  }

  async loadFile(filePath) {
    let key = filePath.substring(this.staticPath.length);
    if (win) key = metautil.replace(key, path.sep, '/');
    try {
      const data = await fsp.readFile(filePath);
      this.static.set(key, data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.console.error(err.stack);
      }
    }
  }

  async loadResource(filePath) {
    let key = filePath.substring(this.resourcesPath.length);
    if (win) key = metautil.replace(key, path.sep, '/');
    try {
      const data = await fsp.readFile(filePath);
      this.resources.set(key, data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.console.error(err.stack);
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
      else if (place === 'resources') await this.loadResource(filePath);
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
        this.console.debug('Reload: ' + relPath);
      }
      if (place === 'api') this.loadMethod(filePath);
      else if (place === 'static') this.loadFile(filePath);
      else if (place === 'resources') this.loadResource(filePath);
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
      intro[iname] = this.signatures[iname + '.' + version];
    }
    return intro;
  }

  getStaticFile(fileName) {
    return this.static.get(fileName);
  }
}

module.exports = new Application();
