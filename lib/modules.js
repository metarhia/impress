'use strict';

const { node, metarhia } = require('./dependencies.js');
const { path } = node;
const { metavm, metautil } = metarhia;

const { Cache } = require('./cache.js');

const MODULE = 2;

const parsePath = (relPath) => {
  const name = path.basename(relPath, '.js');
  const names = relPath.split(path.sep);
  names[names.length - 1] = name;
  return names;
};

class Modules extends Cache {
  constructor(place, application) {
    super(place, application);
    this.tree = {};
  }

  set(relPath, exports, iface) {
    const names = parsePath(relPath);
    let level = this.tree;
    const last = names.length - 1;
    for (let depth = 0; depth <= last; depth++) {
      const name = names[depth];
      let next = level[name];
      if (next && depth === MODULE && name === 'stop') {
        if (exports === null && level.stop) this.emit('stop', level.stop);
      }
      if (depth === last) {
        if (exports === null) {
          delete level[name];
          return;
        }
        next = iface.method || iface;
        exports.parent = level;
      }
      if (next === undefined) next = {};
      level[name] = next;
      if (depth === MODULE && name === 'start') {
        this.emit('start', iface.method);
      }
      level = next;
    }
  }

  delete(filePath) {
    const relPath = filePath.substring(this.path.length + 1);
    const names = parsePath(relPath);
    this.set(names, null, null);
  }

  async change(filePath) {
    if (!filePath.endsWith('.js')) return;
    const options = { context: this.application.sandbox, filename: filePath };
    try {
      const script = await metavm.readScript(filePath, options);
      let exports = script.exports;
      if (typeof exports === 'function') exports = { method: exports };
      const iface = metautil.makePrivate(exports);
      const relPath = filePath.substring(this.path.length + 1);
      this.set(relPath, exports, iface);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.application.console.error(err.stack);
      }
    }
  }
}

module.exports = { Modules };
