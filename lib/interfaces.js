'use strict';

const { node, metarhia } = require('./dependencies.js');
const { fsp, path, events } = node;
const { metavm, metautil } = metarhia;
const { Procedure } = require('./procedure.js');

const getSignature = (method) => {
  const src = method.toString();
  const signature = metautil.between(src, '({', '})');
  if (signature === '') return [];
  return signature.split(',').map((s) => s.trim());
};

class Interfaces extends events.EventEmitter {
  constructor(place, application) {
    super();
    this.path = application.absolute(place);
    this.application = application;
    this.api = {};
    this.signatures = {};
  }

  async createScript(fileName) {
    try {
      const code = await fsp.readFile(fileName, 'utf8');
      if (!code) return null;
      const src = 'context => ' + code;
      const options = { context: this.application.sandbox };
      const { exports } = new metavm.MetaScript(fileName, src, options);
      return exports;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.application.console.error(err.stack);
      }
      return null;
    }
  }

  cacheSignature(interfaceName, methodName, method) {
    let interfaceMethods = this.signatures[interfaceName];
    if (!interfaceMethods) {
      this.signatures[interfaceName] = interfaceMethods = {};
    }
    interfaceMethods[methodName] = getSignature(method);
  }

  delete(filePath) {
    const relPath = filePath.substring(this.path.length + 1);
    if (!relPath.includes(path.sep)) return;
    const [interfaceName, methodFile] = relPath.split(path.sep);
    if (!methodFile.endsWith('.js')) return;
    const name = path.basename(methodFile, '.js');
    const [iname, ver] = interfaceName.split('.');
    const version = parseInt(ver, 10);
    const iface = this.api[iname];
    if (!iface) return null;
    const methods = iface[version.toString()];
    if (methods) delete methods[name];
    const internalInterface = this.application.sandbox.api[iname];
    if (internalInterface) delete internalInterface[name];
  }

  async change(filePath) {
    const relPath = filePath.substring(this.path.length + 1);
    if (!relPath.includes(path.sep)) return;
    const [interfaceName, methodFile] = relPath.split(path.sep);
    if (!methodFile.endsWith('.js')) return;
    const name = path.basename(methodFile, '.js');
    const [iname, ver] = interfaceName.split('.');
    const version = parseInt(ver, 10);
    const script = await this.application.createScript(filePath);
    if (!script) return;
    const proc = new Procedure(script, this);
    let iface = this.api[iname];
    const { api } = this.application.sandbox;
    let internalInterface = api[iname];
    if (!iface) {
      this.api[iname] = iface = { default: version };
      api[iname] = internalInterface = {};
    }
    if (version > iface.default) iface.default = version;
    let methods = iface[ver];
    if (!methods) iface[ver] = methods = {};
    const { method } = proc;
    methods[name] = proc;
    internalInterface[name] = method;
    this.cacheSignature(iname + '.' + version, name, method);
  }

  async load(targetPath = this.path) {
    const files = await fsp.readdir(targetPath, { withFileTypes: true });
    for (const file of files) {
      if (file.name.startsWith('.')) continue;
      const filePath = path.join(targetPath, file.name);
      if (file.isDirectory()) await this.load(filePath);
      else await this.change(filePath);
    }
  }
}

module.exports = { Interfaces };
