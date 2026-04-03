'use strict';

const { node, metarhia } = require('./deps.js');
const { Place } = require('./place.js');
const { join } = node.path.posix;
const { Readable } = node.stream;

const WIN = process.platform === 'win32';
const MAX_FILE_SIZE = '10 mb';
const STREAM_THRESHOLD = '1 mb';
const CHUNK_SIZE = 65536;

const STATUS_CACHE = new Map();

const status = (code) => {
  let file = STATUS_CACHE.get(code);
  if (file) return file;
  const statusText = node.http.STATUS_CODES[code] || 'Unknown error';
  const data = Buffer.from(`<!DOCTYPE html>
<html><head><title>${code} ${statusText}</title></head>
<body><h1>${code} ${statusText}</h1></body></html>`);
  file = { data, stat: null, code };
  STATUS_CACHE.set(code, file);
  return file;
};

const createSABStream = (sab, byteLength, options = {}) => {
  const start = options.start ?? 0;
  const end = options.end ?? byteLength - 1;
  let offset = start;
  return new Readable({
    read() {
      if (offset > end) return void this.push(null);
      const chunkEnd = Math.min(offset + CHUNK_SIZE, end + 1);
      this.push(Buffer.from(sab, offset, chunkEnd - offset));
      offset = chunkEnd;
    },
  });
};

class Static extends Place {
  constructor(name, application, options = {}) {
    super(name, application);
    this.files = new Map();
    this.ext = options.ext;
    this.maxFileSize = -1;
    this.streamThreshold = -1;
    this.search = this.lookup;
    this.errorPage = (code) => status(code);
  }

  get(key) {
    return this.files.get(key);
  }

  getKey(filePath) {
    const key = filePath.substring(this.path.length);
    if (WIN) return metarhia.metautil.replace(key, node.path.sep, '/');
    return key;
  }

  static withData(entry) {
    if (entry.sab) {
      entry.data = Buffer.from(entry.sab, 0, entry.byteLength);
    } else {
      entry.data = null;
    }
    return entry;
  }

  lookup(filePath) {
    let file = this.files.get(filePath);
    if (file) return { file, code: 200 };
    if (filePath.endsWith('/')) {
      file = this.files.get(join(filePath, 'index.html'));
      if (file) return { file, code: 200 };
    }
    return null;
  }

  initCache(entries) {
    this._initThreshold();
    const cacheConfig = this.application.config?.cache;
    if (cacheConfig?.virtualFS) {
      this.search = this.find;
      this.errorPage = (code, path) => this.find(path, code).file;
    }
    this.files.clear();
    for (const entry of entries) {
      this.files.set(entry.key, Static.withData(entry));
    }
  }

  updateEntry(entry) {
    this.files.set(entry.key, Static.withData(entry));
  }

  // Called from worker message handler: remove entry by key
  deleteEntry(key) {
    this.files.delete(key);
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
      if (file) return { file, code };
      if (root) return { file: status(code), code };
    } else {
      const folder = path.endsWith('/');
      if (folder && !parent) {
        filePath = join(path, 'index.html');
      }
      let file = this.get(filePath);
      if (file) return { file, code: 200 };
      filePath = join(path, '.virtual.html');
      file = this.get(filePath);
      if (file) return { file, code: -1 };
      if (root) return this.find(filePath, 404, true);
    }
    filePath = node.path.dirname(path);
    if (filePath !== '/') filePath += '/';
    return this.find(filePath, code, true);
  }

  _initThreshold() {
    if (this.streamThreshold !== -1) return;
    const threshold = this.application.config?.cache?.streamThreshold;
    this.streamThreshold = metarhia.metautil.sizeToBytes(
      threshold || STREAM_THRESHOLD,
    );
  }

  async serve(url, transport) {
    const [filePath] = metarhia.metautil.split(url, '?');
    const fileExt = metarhia.metautil.fileExt(filePath);
    const result = this.search(filePath);

    if (result) {
      const { file, code } = result;

      // SAB-backed cached file (shared memory from main process)
      if (file.sab) {
        const { sab, data, byteLength } = file;
        if (code === -1) return void transport.write(data, 200, 'html');
        const { headers } = transport.req;
        if (headers.range) {
          const range = metarhia.metautil.parseRange(headers.range);
          const { start, end = byteLength - 1 } = range;
          if (start >= end || start >= byteLength || end >= byteLength) {
            const err = this.errorPage(416, filePath);
            return void transport.write(err.data, 416, fileExt);
          }
          if (byteLength > this.streamThreshold) {
            const readable = createSABStream(sab, byteLength, { start, end });
            const options = { start, end, size: byteLength };
            return void transport.write(readable, 206, fileExt, options);
          }
          const slice = data.subarray(start, end + 1);
          const options = { start, end, size: byteLength };
          return void transport.write(slice, 206, fileExt, options);
        }
        if (byteLength > this.streamThreshold) {
          const readable = createSABStream(sab, byteLength);
          const options = { size: byteLength };
          return void transport.write(readable, code, fileExt, options);
        }
        return void transport.write(data, code, fileExt);
      }

      // Legacy path: Buffer-backed cached file (used by cert or local cache)
      if (file.data && file.stat) {
        if (code === -1) return void transport.write(file.data, 200, 'html');
        return void transport.write(file.data, code, fileExt);
      }

      // Status page or virtual file fallback (from find/virtualFS)
      if (file.data) {
        const ext = code === -1 ? 'html' : fileExt;
        const statusCode = code === -1 ? 200 : code || 404;
        return void transport.write(file.data, statusCode, ext);
      }
    }

    // Uncached or oversized file: stream from disk
    const absPath = join(this.path, filePath);
    if (absPath.startsWith(this.path)) {
      const stat = await node.fsp.stat(absPath).catch(() => null);
      if (stat?.isFile()) {
        const { size } = stat;
        const options = { size };
        let code = 200;
        const { headers } = transport.req;
        if (headers.range) {
          const range = metarhia.metautil.parseRange(headers.range);
          const { start, end = size - 1 } = range;
          if (start >= end || start >= size || end >= size) {
            const err = this.errorPage(416, filePath);
            return void transport.write(err.data, 416, fileExt);
          }
          options.start = start;
          options.end = end;
          code = 206;
        }
        const readable = node.fs.createReadStream(absPath, options);
        return void transport.write(readable, code, fileExt, options);
      }
    }

    // 404
    const err = this.errorPage(404, filePath);
    return void transport.write(err.data, 404);
  }
}

module.exports = { Static };
