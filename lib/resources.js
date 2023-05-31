'use strict';

const path = require('node:path');
const fsp = require('node:fs').promises;
const metautil = require('metautil');
const { Cache } = require('./cache.js');

const WIN = process.platform === 'win32';

class Resources extends Cache {
  constructor(place, application, options = {}) {
    super(place, application);
    this.files = new Map();
    this.ext = options.ext;
  }

  get(key) {
    return this.files.get(key);
  }

  getKey(filePath) {
    const key = filePath.substring(this.path.length);
    if (WIN) return metautil.replace(key, path.sep, '/');
    return key;
  }

  delete(filePath) {
    const key = this.getKey(filePath);
    this.files.delete(key);
  }

  async change(filePath) {
    if (this.ext && !filePath.endsWith(filePath)) return;
    try {
      const data = await fsp.readFile(filePath);
      const key = this.getKey(filePath);
      this.files.set(key, data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.application.console.error(error.stack);
      }
    }
  }
}

module.exports = { Resources };
