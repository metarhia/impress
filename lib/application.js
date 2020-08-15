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
    this.staticPath = path.join(this.path, 'static');
    this.domainPath = path.join(this.path, 'domain');
    this.apiPath = path.join(this.path, 'api');
  }

  async init() {
    this.createSandbox();
    await this.loadPlace('api', this.apiPath);
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

  async loadDomain(fileName) {
    const rel = fileName.substring(this.domainPath.length + 1);
    if (!rel.endsWith('.js')) return;
    const name = path.basename(rel, '.js');
    const script = await this.createScript(fileName);
    if (!script) return;
    const config = this.config.sections[name];
    this.sandbox.application[name] = { config };
    const exp = script(EMPTY_CONTEXT);
    if (config) exp.config = config;
    this.sandbox.application[name] = exp;
    this.sandboxInject(name, exp);
    if (exp.start) exp.start();
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

  async loadPlace(place, placePath) {
    const files = await fsp.readdir(placePath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(placePath, file.name);
      if (file.isDirectory()) await this.loadPlace(place, filePath);
      else if (place === 'api') await this.loadMethod(filePath);
      else if (place === 'domain') await this.loadDomain(filePath);
      else if (place === 'static') await this.loadFile(filePath);
    }
    fs.watch(placePath, (event, fileName) => {
      const filePath = path.join(placePath, fileName);
      if (place === 'static') this.loadFile(filePath);
      else this.loadMethod(filePath);
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
