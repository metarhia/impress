'use strict';

const { node, metarhia } = require('./deps.js');
const { Place } = require('./place.js');
const { join } = node.path.posix;

const WIN = process.platform === 'win32';
const MAX_FILE_SIZE = '10 mb';

const STATUS_CACHE = new Map();

const status = (code) => {
  let file = STATUS_CACHE.get(code);
  if (file) return file;
  const status = node.http.STATUS_CODES[code] || 'Unknown error';
  const data = Buffer.from(`<!DOCTYPE html>
<html><head><title>${code} ${status}</title></head>
<body><h1>${code} ${status}</h1></body></html>`);
  file = { data, stat: null, code };
  STATUS_CACHE.set(code, file);
  return file;
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
      const stat = await node.fsp.stat(filePath);
      const key = this.getKey(filePath);
      if (stat.size > this.maxFileSize) {
        this.files.set(key, { data: null, stat });
      } else {
        const data = await node.fsp.readFile(filePath);
        this.files.set(key, { data, stat });
      }
    } catch {
      this.delete(filePath);
    }
  }

  find(path, code, parent = false) {
    let filePath = path;
    const root = path === '/';
    if (code) {
      const fileName = `.${code}.html`;
      filePath = join(filePath, fileName);
      const file = this.get(filePath);
      if (file) return { data: file.data, stat: null, code };
      if (root) return status(code);
    } else {
      const folder = path.endsWith('/');
      if (folder && !parent) {
        filePath = join(path, 'index.html');
      }
      let file = this.get(filePath);
      if (file) return { ...file, code: 200 };
      filePath = join(path, '.virtual.html');
      file = this.get(filePath);
      if (file) return { ...file, code: -1 };
      if (root) return this.find(filePath, 404, true);
    }
    filePath = node.path.dirname(path);
    if (filePath !== '/') filePath += '/';
    return this.find(filePath, code, true);
  }

  async serve(url, transport) {
    const [filePath] = metarhia.metautil.split(url, '?');
    const fileExt = metarhia.metautil.fileExt(filePath);
    let file = this.find(filePath);
    if (file.data && file.stat) {
      if (file.code === -1) return void transport.write(file.data, 200, 'html');
      return void transport.write(file.data, file.code, fileExt);
    }
    const absPath = join(this.path, url);
    if (absPath.startsWith(this.path)) {
      let { stat } = file;
      if (!stat) stat = await node.fsp.stat(absPath).catch(() => null);
      if (stat && stat.isFile()) {
        const { size } = stat;
        const options = { size };
        let code = 200;
        const { headers } = transport.req;
        if (headers.range) {
          const range = metarhia.metautil.parseRange(headers.range);
          const { start, end = size - 1 } = range;
          if (start >= end || start >= size || end >= size) {
            file = this.find(filePath, 416);
            return void transport.write(file.data, 416, fileExt);
          }
          options.start = start;
          options.end = end;
          code = 206;
        }
        const readable = node.fs.createReadStream(absPath, options);
        return void transport.write(readable, code, fileExt, options);
      }
    }
    if (file.code === -1) return void transport.write(file.data, 200, 'html');
    return void transport.write(file.data, 404);
  }
}

module.exports = { Static };
