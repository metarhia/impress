'use strict';

const { node, metarhia } = require('./dependencies.js');
const { fsp, path, events } = node;
const { metautil } = metarhia;

const win = process.platform === 'win32';

class Resources extends events.EventEmitter {
  constructor(placePath) {
    super();
    this.path = placePath;
    this.files = new Map();
  }

  get(key) {
    return this.files.get(key);
  }

  delete(filePath) {
    let key = filePath.substring(this.path.length);
    if (win) key = metautil.replace(key, path.sep, '/');
    this.files.delete(key);
  }

  async change(filePath) {
    let key = filePath.substring(this.path.length);
    if (win) key = metautil.replace(key, path.sep, '/');
    try {
      const data = await fsp.readFile(filePath);
      this.files.set(key, data);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
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

module.exports = { Resources };
