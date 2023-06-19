'use strict';

const { metarhia } = require('./dependencies.js');
const { Cache } = require('./cache.js');
const { preprocess } = require('./services.js');

class Modules extends Cache {
  constructor(place, application) {
    super(place, application);
    this.tree = {};
  }

  stop(name, method) {
    const timeout = this.application.config.server.timeouts.watch;
    setTimeout(() => {
      if (this.tree[name] !== undefined) return;
      this.application.execute(method);
    }, timeout);
  }

  set(relPath, iface) {
    const names = metarhia.metautil.parsePath(relPath);
    let level = this.tree;
    const last = names.length - 1;
    for (let depth = 0; depth <= last; depth++) {
      const name = names[depth];
      let next = level[name];
      if (depth === last) {
        if (iface === null) {
          if (name === 'stop') this.stop(names[0], level.stop);
          delete level[name];
          return;
        }
        next = iface;
        iface.parent = level;
      }
      if (next === undefined) next = { parent: level };
      level[name] = next;
      if (depth === 1 && name === 'start') {
        if (iface.constructor.name === 'AsyncFunction') {
          this.application.starts.push(iface);
        } else {
          const msg = `${relPath} expected to be async function`;
          this.application.console.error(msg);
        }
      }
      level = next;
    }
  }

  delete(filePath) {
    const relPath = filePath.substring(this.path.length + 1);
    this.set(relPath, null);
  }

  async change(filePath) {
    if (!filePath.endsWith('.js')) return;
    const { application, path, place } = this;
    const options = { context: application.sandbox, filename: filePath };
    try {
      const { exports } = await metarhia.metavm.readScript(filePath, options);
      const relPath = filePath.substring(path.length + 1);
      const exp = place === 'bus' ? preprocess(exports, application) : exports;
      this.set(relPath, exp);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        application.console.error(error.stack);
      }
    }
  }
}

module.exports = { Modules };
