'use strict';

const { node, npm, metarhia } = require('./dependencies.js');
const { Procedure } = require('./procedure.js');
const { Cache } = require('./cache.js');

class Apis extends Cache {
  constructor(place, application) {
    super(place, application);
    this.collection = {};
    this.signatures = {};
  }

  async createScript(fileName) {
    try {
      const code = await node.fsp.readFile(fileName, 'utf8');
      if (!code) return null;
      const src = 'context => ' + code;
      const options = { context: this.application.sandbox };
      const { MetaScript } = metarhia.metavm;
      const { exports } = new MetaScript(fileName, src, options);
      return exports;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.application.console.error(error.stack);
      }
      return null;
    }
  }

  cacheSignature(unitName, methodName, method) {
    const name = node.path.basename(unitName, '.js');
    let unitMethods = this.signatures[name];
    if (!unitMethods) {
      this.signatures[name] = unitMethods = {};
    }
    unitMethods[methodName] = metarhia.metautil.getSignature(method);
  }

  delete(filePath) {
    const relPath = filePath.substring(this.path.length + 1);
    if (!relPath.includes(node.path.sep)) return;
    const [unitName, methodFile] = relPath.split(node.path.sep);
    if (!methodFile.endsWith('.js')) return;
    const methodName = node.path.basename(methodFile, '.js');
    const [name, ver] = unitName.split('.');
    const version = parseInt(ver, 10);
    const unit = this.collection[name];
    if (!unit) return;
    const methods = unit[version.toString()];
    if (methods) delete methods[methodName];
    const internalUnit = this.application.sandbox.api[name];
    if (internalUnit) delete internalUnit[methodName];
    const cache = this.signatures[unitName];
    if (cache) delete cache[methodName];
  }

  async change(filePath) {
    if (!filePath.endsWith('.js')) return;
    const script = await this.createScript(filePath);
    if (!script) return;
    const proc = new Procedure(script, 'method', this.application);
    const unit = proc.exports;
    const relPath = filePath.substring(this.path.length + 1);
    const [unitName, methodFile] = relPath.split(node.path.sep);
    if (methodFile) {
      const name = node.path.basename(methodFile, '.js');
      this.changeUnit(unitName, name, proc);
      return;
    }
    if (unit.plugin) {
      this.loadPlugin(unitName, unit);
      return;
    }
    for (const name of Object.keys(unit)) {
      const proc = new Procedure(script, name, this.application);
      this.changeUnit(unitName, name, proc);
    }
  }

  loadPlugin(unitName, unit) {
    const [library, name] = unit.plugin.split('/');
    const lib = metarhia[library] || npm[library];
    if (!lib || !lib.plugins) return;
    const pluginSrc = lib.plugins[name];
    if (!pluginSrc) return;
    const context = this.application.sandbox;
    const options = { context };
    const { exports } = metarhia.metavm.createScript(name, pluginSrc, options);
    const plugin = exports(unit);
    for (const [name, script] of Object.entries(plugin)) {
      const proc = new Procedure(script, name, this.application);
      this.changeUnit(unitName, name, proc);
    }
  }

  changeUnit(unitName, name, proc) {
    const { internalUnit, methods } = this.prepareUnit(unitName);
    methods[name] = proc;
    const { method, exports } = proc;
    internalUnit[name] = method || exports;
    if (method) this.cacheSignature(unitName, name, method);
  }

  prepareUnit(unitName) {
    const [name, ver] = unitName.split('.');
    const version = parseInt(ver, 10);
    let unit = this.collection[name];
    const { api } = this.application.sandbox;
    let internalUnit = api[name];
    if (!unit) {
      this.collection[name] = unit = { default: version };
      api[name] = internalUnit = {};
    }
    if (version > unit.default) unit.default = version;
    let methods = unit[ver];
    if (!methods) unit[ver] = methods = {};
    return { internalUnit, methods };
  }
}

module.exports = { Apis };
