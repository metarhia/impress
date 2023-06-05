'use strict';

const path = require('node:path');
const fsp = require('node:fs').promises;
const metautil = require('metautil');
const { Cache } = require('./cache.js');

const WIN = process.platform === 'win32';
const MAX_FILE_SIZE = '10 mb';

class Resources extends Cache {
  constructor(place, application, options = {}) {
    super(place, application);
    this.files = new Map();
    this.ext = options.ext;
    this.maxFileSize = -1;
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
    if (this.maxFileSize === -1) {
      const maxFileSize = this.application.config?.cache?.maxFileSize;
      this.maxFileSize = metautil.sizeToBytes(maxFileSize || MAX_FILE_SIZE);
    }
    const ext = metautil.fileExt(filePath);
    if (this.ext && !this.ext.includes(ext)) return;
    try {
      const { size } = await fsp.stat(filePath);
      const key = this.getKey(filePath);
      if (size > this.maxFileSize) {
        this.files.set(key, { size });
      } else {
        const data = await fsp.readFile(filePath);
        this.files.set(key, data);
      }
    } catch {
      this.delete(filePath);
    }
  }
}

module.exports = { Resources };
