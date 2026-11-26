'use strict';

const { node, npm, metarhia } = require('./deps.js');
const { EMPTY_CONTEXT, Procedure } = require('./procedure.js');
const { Place } = require('./place.js');

const splitPath = (relPath) => {
  const parts = relPath.split(node.path.sep);
  const folder = parts[0];
  const file = parts[1];
  return { folder, file };
};

const unitVersion = (unitName) => {
  const parts = unitName.split('.');
  const name = parts[0];
  const ver = parts[1];
  const version = parseInt(ver, 10);
  return { name, ver, version };
};

class Api extends Place {
  constructor(name, application) {
    super(name, application);
    this.collection = {};
    this.signatures = {};
  }

  async createScript(fileName) {
    try {
      const code = await node.fsp.readFile(fileName, 'utf8');
      if (!code) return null;
      const src = `context => ${code}`;
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
    let unitMethods = this.signatures[name] ?? null;
    if (!unitMethods) {
      unitMethods = {};
      this.signatures[name] = unitMethods;
    }
    unitMethods[methodName] = metarhia.metautil.getSignature(method);
  }

  delete(filePath) {
    const relPath = this.relative(filePath);
    if (!relPath.includes(node.path.sep)) return;
    const { folder, file } = splitPath(relPath);
    if (!file.endsWith('.js')) return;
    const methodName = node.path.basename(file, '.js');
    const { name, version } = unitVersion(folder);
    const unit = this.collection[name];
    if (!unit) return;
    const methods = unit[`${version}`];
    if (methods) delete methods[methodName];
    const internalUnit = this.application.sandbox.api[name];
    if (internalUnit) delete internalUnit[methodName];
    const cache = this.signatures[folder];
    if (cache) delete cache[methodName];
  }

  async change(filePath) {
    if (!filePath.endsWith('.js')) return;
    const script = await this.createScript(filePath);
    if (!script) return;
    const { application } = this;
    const unit = script(EMPTY_CONTEXT);
    const relPath = this.relative(filePath);
    const { folder, file } = splitPath(relPath);
    const hasVersion = folder.includes('.');
    const unitName = hasVersion ? folder : `${folder}.1`;
    if (file) {
      const name = node.path.basename(file, '.js');
      const proc = new Procedure(script, 'method', application, unit);
      return void this.changeUnit(unitName, name, proc);
    }
    if (unit.plugin) return void this.loadPlugin(unitName, unit);
    const names = Object.keys(unit);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const proc = new Procedure(script, name, application, unit);
      this.changeUnit(unitName, name, proc);
    }
  }

  loadPlugin(unitName, unit) {
    const parts = unit.plugin.split('/');
    const library = parts[0];
    const pluginName = parts[1];
    const lib = metarhia[library] || npm[library];
    if (!lib || !lib.plugins) return;
    const pluginSrc = lib.plugins[pluginName];
    if (!pluginSrc) return;
    const context = this.application.sandbox;
    const options = { context };
    const vm = metarhia.metavm;
    const { exports } = vm.createScript(pluginName, pluginSrc, options);
    const plugin = exports(unit);
    const names = Object.keys(plugin);
    for (let i = 0; i < names.length; i++) {
      const methodName = names[i];
      const script = plugin[methodName];
      const proc = new Procedure(script, methodName, this.application);
      this.changeUnit(unitName, methodName, proc);
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
    const { name, ver, version } = unitVersion(unitName);
    let unit = this.collection[name] ?? null;
    const { api } = this.application.sandbox;
    let internalUnit = api[name] ?? null;
    if (!unit) {
      unit = { default: version };
      this.collection[name] = unit;
      internalUnit = {};
      api[name] = internalUnit;
    }
    if (version > unit.default) unit.default = version;
    let methods = unit[ver] ?? null;
    if (!methods) {
      methods = {};
      unit[ver] = methods;
    }
    return { internalUnit, methods };
  }
}

module.exports = { Api };
