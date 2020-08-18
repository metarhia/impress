'use strict';

const api = require('./dependencies.js');
const { path, events, vm, fs, fsp, common } = api;
const security = require('./security.js');

const SCRIPT_OPTIONS = { timeout: 5000 };
const EMPTY_CONTEXT = Object.freeze({});

class Application extends events.EventEmitter {
  constructor() {
    super();
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
  }

  async init() {
    this.createSandbox();
    await this.loadPlace('api', this.apiPath);
    await this.loadPlace('lib', this.libPath);
    await this.loadPlace('domain', this.domainPath);
    await this.loadPlace('static', this.staticPath);
  }

  async shutdown() {
    this.finalization = true;
    await this.server.close();
    await this.logger.close();
  }

  createSandbox() {
    const introspect = async interfaces => this.introspect(interfaces);
    const application = { security, introspect };
    for (const name of this.namespaces) application[name] = this[name];
    const sandbox = {
      console: this.console, Buffer, application, api,
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

  getMethod(iname, ver, methodName, session) {
    const iface = this.api[iname];
    if (!iface) return null;
    const version = ver === '*' ? iface.default : parseInt(ver);
    const methods = iface[version.toString()];
    if (!methods) return null;
    const method = methods[methodName];
    if (!method) return null;
    const exp = method(session ? session.context : EMPTY_CONTEXT);
    return typeof exp !== 'object' ? { access: 'logged', method: exp } : exp;
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
    if (!iface) this.api[iname] = iface = { default: version };
    let methods = iface[ver];
    if (!methods) iface[ver] = methods = {};
    methods[name] = script;
    if (version > iface.default) iface.default = version;
  }

  async loadModule(fileName) {
    const rel = fileName.substring(this.path.length + 1);
    if (!rel.endsWith('.js')) return;
    const script = await this.createScript(fileName);
    if (!script) return;
    const name = path.basename(rel, '.js');
    const namespaces = rel.split(path.sep);
    namespaces[namespaces.length - 1] = name;
    const exp = script(EMPTY_CONTEXT);
    let level = this.sandbox;
    for (let i = 0; i < namespaces.length; i++) {
      const namespace = namespaces[i];
      let next = level[namespace];
      if (!next) {
        next = {};
        if (i === 1) {
          const config = this.config.sections[namespace];
          if (config) next.config = config;
        }
        level[namespace] = next;
      }
      level = next;
    }
    Object.assign(level, exp);
    if (level.start) level.start();
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
      const filePath = path.join(placePath, file.name);
      if (file.isDirectory()) await this.loadPlace(place, filePath);
      else if (place === 'api') await this.loadMethod(filePath);
      else if (place === 'static') await this.loadFile(filePath);
      else await this.loadModule(filePath);
    }
    fs.watch(placePath, (event, fileName) => {
      const filePath = path.join(placePath, fileName);
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

module.exports = new Application();
