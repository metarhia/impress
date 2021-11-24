'use strict';

const path = require('path');
const metavm = require('metavm');
const { Cache } = require('./cache.js');

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

  stop(name, method) {
    const timeout = this.application.config.server.timeouts.watch;
    setTimeout(() => {
      if (this.tree[name] !== undefined) return;
      this.application.execute(method);
    }, timeout);
  }

  set(relPath, exports) {
    const names = parsePath(relPath);
    const method = [this.place, ...names].join('.');
    const iface = this.wrapIface(method, exports);
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
        if (exports.constructor.name === 'AsyncFunction') {
          this.application.starts.push(exports);
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
    const options = { context: this.application.sandbox, filename: filePath };
    try {
      const { exports } = await metavm.readScript(filePath, options);
      const relPath = filePath.substring(this.path.length + 1);
      this.set(relPath, exports);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.application.console.error(err.stack);
      }
    }
  }

  wrapIface(method, iface) {
    if (iface.constructor.name === 'AsyncFunction') {
      const { invoke } = this.application;
      return (args) => ({
        handler: iface,
        args,
        then(resolve, reject) {
          return this.handler(this.args).then(resolve, reject);
        },
        catch(reject) {
          return this.handler(this.args).then(null, reject);
        },
        inThread({ exclusive = false }) {
          this.handler = invoke;
          this.args = { method, exclusive, args };
          return this;
        },
      });
    }
    return iface;
  }
}

module.exports = { Modules };
