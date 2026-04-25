'use strict';

const path = require('node:path');
const fsp = require('node:fs/promises');
const metautil = require('metautil');

const WIN = process.platform === 'win32';

const toKey = WIN
  ? (filePath, base) => {
      const key = filePath.substring(base.length);
      return metautil.replace(key, path.sep, '/');
    }
  : (filePath, base) => filePath.substring(base.length);

class PlacementSource {
  constructor(name, dir, watcher, options = {}) {
    this.name = name;
    this.path = path.join(dir, name);
    this.watcher = watcher;
    this.files = new Map();
    this.ext = options.ext || null;
  }

  getKey(filePath) {
    return toKey(filePath, this.path);
  }

  async load(targetPath = this.path) {
    this.watcher.watch(targetPath);
    let entries;
    try {
      entries = await fsp.readdir(targetPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filePath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        await this.load(filePath);
      } else {
        await this.change(filePath);
      }
    }
  }

  async change(filePath) {
    const ext = metautil.fileExt(filePath);
    if (this.ext && !this.ext.includes(ext)) return;
    try {
      const stat = await fsp.stat(filePath);
      const key = this.getKey(filePath);
      this.files.set(key, { stat, path: filePath });
    } catch {
      const key = this.getKey(filePath);
      this.files.delete(key);
    }
  }
}

module.exports = { PlacementSource };
