'use strict';

const { node, metarhia } = require('./deps.js');
const { join } = node.path.posix;
const { Readable } = node.stream;

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

const createSABStream = (data, options = {}) => {
  const sab = data.buffer;
  const base = data.byteOffset;
  const total = data.byteLength;
  const start = base + (options.start ?? 0);
  const end = base + (options.end ?? total - 1);
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

class Static {
  constructor(name, application) {
    this.name = name;
    this.path = application.absolute(name);
    this.files = new Map();
    this.streamThreshold = Infinity;
  }

  get(key) {
    return this.files.get(key);
  }

  setFiles(filesMap) {
    this.files = filesMap;
  }

  updateFiles(updates) {
    for (const [key, file] of updates) {
      this.files.set(key, file);
    }
  }

  deleteFiles(keys) {
    for (const key of keys) {
      this.files.delete(key);
    }
  }

  initServing(config) {
    const cacheConfig = config?.cache || {};
    const { sizeToBytes } = metarhia.metautil;
    this.streamThreshold = sizeToBytes(cacheConfig.streamThreshold || '1 mb');
    if (cacheConfig.virtualFS) {
      this.search = this.find;
      this.errorPage = (code, path) => this.find(path, code);
    } else {
      this.search = this.lookup;
      this.errorPage = (code) => status(code);
    }
  }

  lookup(filePath) {
    let file = this.files.get(filePath);
    if (file) return { ...file, code: 200 };
    if (filePath.endsWith('/')) {
      file = this.files.get(join(filePath, 'index.html'));
      if (file) return { ...file, code: 200 };
    }
    return null;
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

    // Fast exact-hit path for ordinary cached files
    const exact = this.get(filePath);
    const internal = node.path.basename(filePath).startsWith('.');
    if (exact && exact.data && exact.stat && !internal) {
      const { data } = exact;
      const size = data.byteLength;
      const { headers } = transport.req;
      if (headers.range) {
        const range = metarhia.metautil.parseRange(headers.range);
        const { start, end = size - 1 } = range;
        if (start >= end || start >= size || end >= size) {
          const err = this.errorPage(416, filePath);
          return void transport.write(err.data, 416, fileExt);
        }
        if (size > this.streamThreshold) {
          const readable = createSABStream(data, { start, end });
          const options = { start, end, size };
          return void transport.write(readable, 206, fileExt, options);
        }
        const slice = data.subarray(start, end + 1);
        const options = { start, end, size };
        return void transport.write(slice, 206, fileExt, options);
      }
      if (size > this.streamThreshold) {
        const readable = createSABStream(data);
        const options = { size };
        return void transport.write(readable, 200, fileExt, options);
      }
      return void transport.write(data, 200, fileExt);
    }

    // Recursive search (index, virtual, status pages).
    // Range and streaming are intentionally omitted here — these paths only
    // resolve small HTML files (index.html, .virtual.html, .NNN.html).
    // Direct file requests always hit the exact-hit path above which supports
    // full Range/streaming. find()/virtualFS are candidates for deprecation.
    const file = this.search(filePath);
    if (file && file.data && file.stat) {
      if (file.code === -1) return void transport.write(file.data, 200, 'html');
      return void transport.write(file.data, file.code, fileExt);
    }
    if (file && file.data) {
      const ext = file.code === -1 ? 'html' : fileExt;
      const statusCode = file.code === -1 ? 200 : file.code || 404;
      return void transport.write(file.data, statusCode, ext);
    }

    // Disk fallback: uncached or oversized file
    const absPath = join(this.path, filePath);
    if (absPath.startsWith(this.path)) {
      const fsStat = await node.fsp.stat(absPath).catch(() => null);
      const diskStat = file?.stat || fsStat;
      if (diskStat && (!diskStat.isFile || diskStat.isFile())) {
        const { size } = diskStat;
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
