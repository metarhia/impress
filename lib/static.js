'use strict';

const { node, metarhia } = require('./deps.js');
const { Place } = require('./place.js');

const WIN = process.platform === 'win32';
const MAX_FILE_SIZE = '10 mb';

const STATUS_CACHE = new Map();

const status = (httpCode) => {
  const buffer = STATUS_CACHE.get(httpCode);
  if (buffer) return buffer;
  const status = node.http.STATUS_CODES[httpCode] || 'Unknown error';
  return Buffer.from(`<!DOCTYPE html>
<html><head><title>${httpCode} ${status}</title></head>
<body><h1>${httpCode} ${status}</h1></body></html>`);
};

class Static extends Place {
  constructor(name, application, options = {}) {
    super(name, application);
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

  findTemplate(path, httpCode) {
    const filePath = node.path.join(path, '.' + httpCode.toString() + '.html');
    const data = this.get(filePath);
    if (Buffer.isBuffer(data)) return data;
    if (path === '/') return status(httpCode);
    const parentPath = node.path.dirname(path);
    return this.findTemplate(parentPath, httpCode);
  }

  getCached(path, httpCode) {
    return httpCode ? this.findTemplate(path, httpCode) : this.get(path);
  }

  async serve(url, transport, httpCode) {
    const [urlPath, params] = metarhia.metautil.split(url, '?');
    const folder = urlPath.endsWith('/');
    const filePath = urlPath + (folder ? 'index.html' : '');
    const fileExt = metarhia.metautil.fileExt(filePath);
    const data = this.getCached(filePath, httpCode);
    const code = httpCode || 200;
    if (Buffer.isBuffer(data)) return void transport.write(data, code, fileExt);
    if (!folder && this.get(urlPath + '/index.html')) {
      const query = params ? '?' + params : '';
      return void transport.redirect(urlPath + '/' + query);
    }
    const absPath = node.path.join(this.path, url);
    if (absPath.startsWith(this.path)) {
      const stat = await node.fsp.stat(absPath).catch(() => null);
      if (!stat || !stat.isFile()) return void this.serve(url, transport, 404);
      const { size } = stat;
      const range = metarhia.metautil.parseRange(transport.req.headers.range);
      const { start, end = size - 1 } = range;
      if (start >= end || start >= size || end >= size) {
        return void this.serve(url, transport, 416);
      }
      const options = { start, end, size };
      const readable = node.fs.createReadStream(absPath, options);
      return void transport.write(readable, 206, fileExt, options);
    }
    this.serve(url, transport, 404);
  }
}

module.exports = { Static };
