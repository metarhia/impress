'use strict';

const { node, metarhia } = require('./dependencies.js');
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
    if (WIN) return metarhia.metautil.replace(key, node.path.sep, '/');
    return key;
  }

  delete(filePath) {
    const key = this.getKey(filePath);
    this.files.delete(key);
  }

  async change(filePath) {
    if (this.maxFileSize === -1) {
      const maxFileSize = this.application.config?.cache?.maxFileSize;
      const size = maxFileSize || MAX_FILE_SIZE;
      this.maxFileSize = metarhia.metautil.sizeToBytes(size);
    }
    const ext = metarhia.metautil.fileExt(filePath);
    if (this.ext && !this.ext.includes(ext)) return;
    try {
      const { size } = await node.fsp.stat(filePath);
      const key = this.getKey(filePath);
      if (size > this.maxFileSize) {
        this.files.set(key, { size });
      } else {
        const data = await node.fsp.readFile(filePath);
        this.files.set(key, data);
      }
    } catch {
      this.delete(filePath);
    }
  }

  async serve(url, transport) {
    const [urlPath, params] = metarhia.metautil.split(url, '?');
    const folder = urlPath.endsWith('/');
    const filePath = urlPath + (folder ? 'index.html' : '');
    const fileExt = metarhia.metautil.fileExt(filePath);
    const data = this.get(filePath);
    if (Buffer.isBuffer(data)) {
      transport.write(data, 200, fileExt);
      return;
    }
    if (!folder && this.get(urlPath + '/index.html')) {
      const query = params ? '?' + params : '';
      transport.redirect(urlPath + '/' + query);
      return;
    }
    const absPath = node.path.join(this.path, url);
    if (absPath.startsWith(this.path)) {
      const { size } = await node.fsp.stat(absPath);
      const range = metarhia.metautil.parseRange(transport.req.headers.range);
      const { start, end = size - 1 } = range;
      if (start >= end || start >= size || end >= size) {
        transport.error(416);
        return;
      }
      const options = { start, end, size };
      const readable = node.fs.createReadStream(absPath, options);
      readable.on('error', () => {
        transport.error(404);
      });
      transport.write(readable, 206, fileExt, options);
      return;
    }
    transport.error(404);
  }
}

module.exports = { Resources };
