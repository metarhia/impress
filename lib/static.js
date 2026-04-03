'use strict';

const { node, metarhia } = require('./deps.js');
const { Place } = require('./place.js');
const { path, stream, http, fsp, fs } = node;
const { STATUS_CODES } = http;
const { metautil } = metarhia;
const { Readable } = stream;
const { createReadStream } = fs;

const WIN = process.platform === 'win32';
const MAX_FILE_SIZE = '10 mb';

const MIME_TYPES = {
  bin: 'application/octet-stream',
  htm: 'text/html',
  html: 'text/html',
  shtml: 'text/html',
  json: 'application/json',
  xml: 'text/xml',
  js: 'application/javascript',
  mjs: 'application/javascript',
  css: 'text/css',
  txt: 'text/plain',
  csv: 'text/csv',
  ics: 'text/calendar',
  avif: 'image/avif',
  bmp: 'image/x-ms-bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpg: 'image/jpg',
  png: 'image/png',
  svg: 'image/svg+xml',
  svgz: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  webp: 'image/webp',
  aac: 'audio/aac',
  m4a: 'audio/x-m4a',
  mid: 'audio/midi',
  midi: 'audio/midi',
  mp3: 'audio/mpeg',
  oga: 'audio/ogg',
  ra: 'audio/x-realaudio',
  wav: 'audio/wav',
  weba: 'audio/webm',
  '3gpp': 'video/3gpp',
  '3gp': 'video/3gpp',
  asf: 'video/x-ms-asf',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  ogv: 'video/ogg',
  webm: 'video/webm',
  otf: 'font/otf',
  ttf: 'font/ttf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  pdf: 'application/pdf',
  wasm: 'application/wasm',
  gz: 'application/gzip',
  zip: 'application/zip',
};

const STATUS_CACHE = new Map();

const status = (code) => {
  let file = STATUS_CACHE.get(code);
  if (file) return file;
  const statusText = STATUS_CODES[code] || 'Unknown error';
  const data = Buffer.from(`<!DOCTYPE html>
<html><head><title>${code} ${statusText}</title></head>
<body><h1>${code} ${statusText}</h1></body></html>`);
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
      const size = maxFileSize || MAX_FILE_SIZE;
      this.maxFileSize = metautil.sizeToBytes(size);
    }
    const ext = metautil.fileExt(filePath);
    if (this.ext && !this.ext.includes(ext)) return;
    try {
      const stat = await fsp.stat(filePath);
      const key = this.getKey(filePath);
      if (stat.size > this.maxFileSize) {
        this.files.set(key, { data: null, stat });
      } else {
        const data = await fsp.readFile(filePath);
        this.files.set(key, { data, stat });
      }
    } catch {
      this.delete(filePath);
    }
  }

  find(requestPath, code, isParent = false, depth = 0) {
    if (depth > 64) return status(code || 404);
    let filePath = requestPath;
    const root = requestPath === '/';
    if (code) {
      const fileName = `.${code}.html`;
      filePath = path.posix.join(filePath, fileName);
      const file = this.get(filePath);
      if (file) return { data: file.data, stat: null, code };
      if (root) return status(code);
    } else {
      const folder = requestPath.endsWith('/');
      if (folder && !isParent) {
        filePath = path.posix.join(requestPath, 'index.html');
      }
      let file = this.get(filePath);
      if (file) return { ...file, code: 200 };
      filePath = path.posix.join(requestPath, '.virtual.html');
      file = this.get(filePath);
      if (file) return { ...file, code: -1 };
      if (root) return this.find(filePath, 404, true, depth + 1);
    }
    filePath = path.dirname(requestPath);
    if (filePath !== '/') filePath += '/';
    return this.find(filePath, code, true, depth + 1);
  }

  async serve(url, req, res) {
    const [filePath] = metautil.split(url, '?');
    const fileExt = metautil.fileExt(filePath);
    let file = this.find(filePath);
    if (file.data && file.stat) {
      if (file.code === -1) this.write(req, res, file.data, 200, 'html');
      else this.write(req, res, file.data, file.code, fileExt);
      return;
    }
    const absPath = path.posix.join(this.path, url);
    if (absPath.startsWith(this.path)) {
      let { stat } = file;
      if (!stat) stat = await fsp.stat(absPath).catch(() => null);
      if (stat && stat.isFile()) {
        const { size } = stat;
        const options = { size };
        let code = 200;
        if (req.headers.range) {
          const range = metautil.parseRange(req.headers.range);
          const { start, end = size - 1 } = range;
          if (start >= end || start >= size || end >= size) {
            file = this.find(filePath, 416);
            return void this.write(req, res, file.data, 416, fileExt);
          }
          options.start = start;
          options.end = end;
          code = 206;
        }
        const readable = createReadStream(absPath, options);
        return void this.write(req, res, readable, code, fileExt, options);
      }
    }
    if (file.code === -1) this.write(req, res, file.data, 200, 'html');
    else this.write(req, res, file.data, 404);
  }

  write(req, res, data, code, ext = 'html', options = {}) {
    const mimeType = (code === 200 && MIME_TYPES[ext]) || MIME_TYPES.html;
    const headers = { 'Content-Type': mimeType };
    if (code === 206) {
      const { start, end, size = '*' } = options;
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
      headers['Accept-Ranges'] = 'bytes';
      headers['Content-Length'] = end - start + 1;
    }
    if (data instanceof Readable) {
      res.writeHead(code, headers);
      data.pipe(res);
    } else {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      headers['Content-Length'] = buf.length;
      res.writeHead(code, headers);
      res.end(buf);
    }
    const { console } = this.application;
    const { socket, url, method } = req;
    const ip = socket.remoteAddress;
    console.debug(`${ip}\t${method}\t${url}\t${code}`);
  }
}

module.exports = { Static };
