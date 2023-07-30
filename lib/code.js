'use strict';

const { metarhia } = require('./deps.js');
const { Place } = require('./place.js');
const bus = require('./bus.js');

class Code extends Place {
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

  set(relPath, unit) {
    const names = metarhia.metautil.parsePath(relPath);
    let level = this.tree;
    const last = names.length - 1;
    for (let depth = 0; depth <= last; depth++) {
      const name = names[depth];
      let next = level[name];
      if (depth === last) {
        if (unit === null) {
          if (name === 'stop') this.stop(names[0], level.stop);
          delete level[name];
          return;
        }
        next = unit;
        unit.parent = level;
      }
      if (next === undefined) next = { parent: level };
      level[name] = next;
      if (depth === 1 && name === 'start') {
        if (unit.constructor.name === 'AsyncFunction') {
          this.application.starts.push(unit);
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
      const exp = place === 'bus' ? bus.prepare(exports, application) : exports;
      this.set(relPath, exp);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        application.console.error(error.stack);
      }
    }
  }
}

module.exports = { Code };
