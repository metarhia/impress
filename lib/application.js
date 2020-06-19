'use strict';

const api = require('./dependencies.js');
const { path, events, vm, fs, fsp, common } = api;
const security = require('./security.js');

const SCRIPT_OPTIONS = { timeout: 5000 };

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
    await this.loadPlace('static', this.staticPath);
    await this.loadPlace('domain', this.domainPath);
    await this.loadPlace('api', this.apiPath);
  }

  async shutdown() {
    this.finalization = true;
    await this.server.close();
    await this.logger.close();
  }

  createSandbox() {
    const introspect = async interfaces => this.introspect(interfaces);
    const context = Object.freeze({});
    const application = { security, context, introspect };
    for (const name of this.namespaces) application[name] = this[name];
    const sandbox = {
      console: this.console, Buffer, application, api,
      setTimeout, setImmediate, setInterval,
      clearTimeout, clearImmediate, clearInterval,
    };
    sandbox.global = sandbox;
    return vm.createContext(sandbox);
  }

  sandboxInject(name, module) {
    this[name] = Object.freeze(module);
    this.namespaces.push(name);
  }

  async createScript(fileName) {
    const code = await fsp.readFile(fileName, 'utf8');
    const src = '\'use strict\';\n' + code;
    const options = { filename: fileName, lineOffset: -1 };
    try {
      return new vm.Script(src, options);
    } catch (err) {
      this.logger.error(err.stack);
      return null;
    }
  }

  runScript(iname, ver, methodName, session) {
    const { sandbox } = session || this;
    const iface = this.api[iname];
    if (!iface) return null;
    const version = ver === '*' ? iface.default : parseInt(ver);
    const methods = iface[version.toString()];
    if (!methods) return null;
    const script = methods[methodName];
    if (!script) return null;
    const exp = script.runInContext(sandbox, SCRIPT_OPTIONS);
    return typeof exp !== 'object' ? { access: 'logged', method: exp } : exp;
  }

  async loadFile(filePath) {
    const key = filePath.substring(this.staticPath.length);
    try {
      const data = await fsp.readFile(filePath);
      this.static.set(key, data);
    } catch (err) {
      this.logger.error(err.stack);
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async loadDomain(fileName) {
    const rel = fileName.substring(this.domainPath.length + 1);
    if (!rel.endsWith('.js')) return;
    const name = path.basename(rel, '.js');
    const script = await this.createScript(fileName);
    if (!script) return;
    const config = this.config.sections[name];
    const sandbox = this.domainSandbox;
    sandbox.application[name] = { config };
    const exp = script.runInContext(sandbox, SCRIPT_OPTIONS);
    if (config) exp.config = config;
    sandbox.application[name] = exp;
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
      else if (place === 'static') await this.loadFile(filePath);
      else if (place === 'domain') await this.loadDomain(filePath);
      else if (place === 'api') await this.loadMethod(filePath);
    }
    fs.watch(placePath, (event, fileName) => {
      const filePath = path.join(placePath, fileName);
      if (place === 'static') this.loadFile(filePath);
      else this.loadScript(place, filePath);
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
        const script = methods[methodName];
        const exp = script.runInContext(this.sandbox, SCRIPT_OPTIONS);
        const fn = typeof exp === 'object' ? exp.method : exp;
        const src = fn.toString();
        const signature = common.between(src, '({', '})');
        const args = signature.split(',').map(s => s.trim());
        interfaceMethods[methodName] = args;
      }
    }
    return intro;
  }
}

module.exports = new Application();
