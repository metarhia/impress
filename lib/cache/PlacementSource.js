'use strict';

const { node, metarhia } = require('../deps.js');
const { Place } = require('../place.js');

const WIN = process.platform === 'win32';

const toKey = WIN
  ? (filePath, base) => {
      const key = filePath.substring(base.length);
      return metarhia.metautil.replace(key, node.path.sep, '/');
    }
  : (filePath, base) => filePath.substring(base.length);

class PlacementSource extends Place {
  constructor(name, application, options = {}) {
    super(name, application);
    this.files = new Map();
    this.ext = options.ext;
  }

  getKey(filePath) {
    return toKey(filePath, this.path);
  }

  async change(filePath) {
    const ext = metarhia.metautil.fileExt(filePath);
    if (this.ext && !this.ext.includes(ext)) return;
    try {
      const stat = await node.fsp.stat(filePath);
      const key = this.getKey(filePath);
      this.files.set(key, { stat, path: filePath });
    } catch {
      const key = this.getKey(filePath);
      this.files.delete(key);
    }
  }
}

module.exports = { PlacementSource };
