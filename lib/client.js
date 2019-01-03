'use strict';

// HTTP Client interface for Impress Application Server

const COOKIES_EXPIRES =
  '=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain=';

const DEFAULT_ACCESS = {
  guests: true, // allow access for non-authenticated connections
  logged: true, // allow access for authenticated connections
  http: true, // allow via HTTP
  https: true, // allow via HTTPS
  intro: false, // allow API introspection
  virtual: false, // allow virtual folders if true or reply 404 if false
  groups: [] // allow access for certain groups (ampty list allows to all)
};

const STATUS_CODES = api.http.STATUS_CODES;
if (!STATUS_CODES[508]) STATUS_CODES[508] = 'Loop Detected';

const DEFAULT_SLOW_TIME = api.common.duration('2s');

class Client {

  // Client constructor
  //   application <Object>
  //   req <IncomingMessage>
  //   res <ServerResponse>
  constructor(application, req, res) {
    const socket = req.socket || req.connection.socket;
    const server = impress.servers[socket.server.serverName];
    const url = api.url.parse(req.url);
    const config = server.config;

    req.connection.client = this;

    this.startTime = Date.now();
    this.req = req;
    this.res = res;
    this.websocket = null;
    this.socket = socket;
    this.server = server;
    this.application = application;
    this.dynamicHandler = false;
    this.query = api.querystring.parse(url.query);
    this.schema = config.transport === 'tls' ? 'https' : 'http';
    this.method = req.method.toLowerCase();
    this.access = Object.assign({}, DEFAULT_ACCESS);
    this.calculateAccess();
    this.fields = null; // <Object>
    this.files = null; // <Object>
    this.slowTime = config.slowTime || DEFAULT_SLOW_TIME;
    this.timedOut = false;
    this.finished = false;
    this.url = url.pathname;
    this.host = api.common.parseHost(req.headers.host);
    this.path = api.common.addTrailingSlash(this.url);
    this.pathDir = api.path.join(application.dir, 'www', this.path);
    this.realPath = this.path;
    this.realPathDir = this.pathDir;
    this.execPath = this.path;
    this.execPathDir = this.pathDir;
    this.ext = api.common.fileExt(this.path);
    this.typeExt = this.ext || 'html';
    this.data = ''; // data received from client
    this.context = {};
    this.chunks = []; // for large requests receiving in chunks
    this.ip = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      socket.remoteAddress;
    this.cookies = {}; // received cookies
    this.preparedCookies = []; // cookies to send

    if (res.setHeader) {
      const contentType = impress.MIME_TYPES[this.typeExt];
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public');
      const timeout = Math.round(server.keepAlive / 1000);
      res.setHeader('Keep-Alive', 'timeout=' + timeout);
    }
    if (this.ip) {
      const ip = api.net.isIPv6(this.ip) ? this.ip.slice(7) : this.ip;
      this.ipInt = api.common.ipToInt(ip);
      application.emit('clientConnect', this);
      this.local = api.common.localIPs().includes(this.ip);
    } else {
      this.ipInt = undefined;
      this.local = false;
    }

    this.session = null;
    this.sessionCreated = false;
    this.sessionModified = false;
    this.logged = false;
    this.currentHandler = undefined;

    // Socket leak workaround
    res.on('finish', () => {
      application.emit('clientDisconnect', this);
      socket.removeAllListeners('timeout');
      socket.setTimeout(server.keepAlive, () => {
        socket.destroy();
      });
    });
  }

  parseCookies() {
    const cookie = this.req.headers.cookie;
    if (cookie) {
      const cookies = cookie.split(';');
      for (const item of cookies) {
        const parts = item.split('=');
        const key = parts[0].trim();
        const val = parts[1] || '';
        this.cookies[key] = val.trim();
      }
    }
  }

  // Set cookie
  //   name <string> cookie name
  //   value <string> cookie value
  //   host <string> host name (optional)
  //   httpOnly <boolean> HttpOnly cookie modifier (optional)
  setCookie(name, value, hostname, httpOnly = true) {
    const expires = new Date(2100, 1, 1).toUTCString();
    const hostport = hostname || this.req.headers.host;
    const pos = hostport.indexOf(':');
    const host = pos > -1 ? hostport.substring(0, pos) : hostport;
    this.preparedCookies.push(
      name + '=' + value + '; expires=' + expires +
      '; Path=/; Domain=' + host + (httpOnly ? '; HttpOnly' : '')
    );
  }

  // Delete cookie
  //   name <string> cookie name
  //   host <string>
  deleteCookie(name, host) {
    let aHost = host || this.req.headers.host;
    if (api.net.isIP(aHost) === 0) aHost = '.' + aHost;
    this.preparedCookies.push(name + COOKIES_EXPIRES + aHost);
  }

  sendCookie() {
    const prepared = this.preparedCookies;
    if (prepared && !this.res.headersSent) {
      this.res.setHeader('Set-Cookie', prepared);
    }
  }

  // Route request to external HTTP server
  //   hostname <string> forward request to host name or IP address
  //   port <number> request port
  proxy(hostname, port, path) {
    const target = { hostname, port, path, method: this.req.method };
    const req = api.http.request(target, response => {
      this.res.writeHead(response.statusCode, response.headers);
      response.on('data', chunk => {
        this.res.write(chunk);
      });
      response.on('end', () => {
        this.end();
      });
    });
    req.on('error', err => {
      this.application.log.error(`Error proxying request: ${err.message}`);
    });
    req.end();
    impress.stat.res++;
  }

  dispatch() {
    this.dynamicHandler = true;
    this.parseCookies();
    // TODO: Temporary disable application firewall
    //       to refactor security subsystem and sessions
    // const code = api.firewall.check(this);
    // if (code === api.firewall.ACCESS_ALLOWED) {
    this.application.security.restoreSession(this, () => {
      this.detectRealPath(() => {
        this.processing();
      });
    });
    // } else if (code === api.firewall.ACCESS_DENIED) {
    //   this.error(403);
    // } else if (code === api.firewall.ACCESS_LIMITED) {
    //   this.error(429);
    // } else {
    //   this.error(400);
    // }
  }

  // Add current client to deny list by IP and Token (if session exists)
  block(/*msec*/) {
    this.error(403);
    // TODO: Temporary disable application firewall
    //       to refactor security subsystem and sessions
    // const duration = api.common.duration(msec) || 0;
    // api.firewall.ip.deny(this.ipInt, duration);
    // if (this.session) {
    //   api.firewall.token.deny(this.session.token, duration);
    // }
  }

  processing() {
    const cache = this.application.cache.pages[this.realPath];
    if (cache && this.startTime < cache.expireTime) {
      this.sendCache(cache);
      return;
    }
    if (!this.ext) {
      this.ext = api.common.fileExt(this.realPath);
      this.typeExt = this.ext || 'html';
    }
    this.defaultContentType();
    if (this.ext === 'ws') {
      api.websocket.initialize(this);
    }

    this.fileHandler('access', false, () => {
      if (!this.access.allowed) {
        this.error(403);
        return;
      }
      if (this.path !== this.realPath && !this.access.virtual) {
        this.error(404);
        return;
      }
      this.execPath = this.realPath;
      this.execPathDir = this.realPathDir;
      this.fileHandler(this.method, false, err => {
        if (err) {
          this.error(404);
          return;
        }
        if (this.access.auth && !this.local) {
          this.basicAuth();
          return;
        }
        if (this.ext === '' && this.access.intro) {
          this.introspect();
          return;
        }
        const ext = impress.extensions;
        const extCase = ext[this.typeExt] || ext.html;
        extCase(this);
      });
    });
  }

  basicAuth() {
    let authBase64 = this.req.headers.authorization;
    let authAllowed = false;
    if (authBase64) {
      authBase64 = authBase64.substring(6);
      const auth = Buffer.from(authBase64, 'base64');
      authAllowed = this.access.auth === auth.toString();
    }
    if (!authAllowed) {
      const realm = this.access.realm || 'Restricted';
      this.res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      this.error(401);
    }
  }

  allowOrigin() {
    const config = this.application.config.sections.application;
    if (config) {
      const origin = config.allowOrigin;
      if (origin) {
        const headers = 'origin, content-type, accept';
        this.res.setHeader('Access-Control-Allow-Origin', origin);
        this.res.setHeader('Access-Control-Allow-Headers', headers);
      }
    }
  }

  defaultContentType() {
    const contentType = impress.MIME_TYPES[this.typeExt];
    if (contentType) {
      this.res.setHeader('Content-Type', contentType);
    }
    this.allowOrigin();
  }

  processingPage() {
    this.execPath = this.realPath;
    this.execPathDir = this.realPathDir;
    this.template('html', (err, tpl) => {
      if (err) {
        this.error(500);
        return;
      }
      this.end(tpl);
    });
  }

  // Cache URL response
  //   timeout <number> | <string> milliseconds or duration
  cache(timeout) {
    this.context.cache = api.common.duration(timeout);
  }

  // End request
  //   output <string> | <Buffer> | <Object> { stats, compressed, data }
  end(output) {
    if (this.finished) return;
    this.finished = true;

    const isString = typeof output === 'string';
    const isBuffer = output instanceof Buffer;
    const isUndef = output === undefined;
    const cache = isString || isBuffer || isUndef ? { data: output } : output;
    const length = cache && cache.data ? cache.data.length : 0;

    this.application.security.saveSession(this, () => {
      const res = this.res;
      this.sendCookie();
      if (!res.headersSent) {
        if (cache.stats) {
          res.setHeader('Content-Length', cache.stats.size);
          res.setHeader('Last-Modified', cache.stats.mtime.toGMTString());
        }
        if (cache.compressed) res.setHeader('Content-Encoding', 'gzip');
      }
      if (isString && length > impress.COMPRESS_ABOVE) {
        if (res.headersSent) {
          res.end();
          return;
        }
        api.zlib.gzip(cache.data, (err, data) => {
          if (err) {
            this.error(500, err);
            return;
          }
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', data.length);
          res.end(data);
          if (this.context && this.context.cache) this.saveCache(data);
        });
      } else {
        res.end(cache.data);
        if (this.context && this.context.cache) this.saveCache(cache.data);
      }
      impress.accessLog(this);
      impress.stat.res++;
    });
  }

  // Save cache
  //   data <string>
  saveCache(data) {
    const now = new Date();
    const mtime = now.getTime();
    const time = now.toGMTString();

    this.application.cache.pages[this.realPath] = {
      expireTime: this.startTime + this.context.cache,
      statusCode: this.res.statusCode,
      contentType: this.res.getHeader('content-type'),
      contentEncoding: this.res.getHeader('content-encoding'),
      stats: { size: data.length, mtime, time },
      data,
    };
  }

  // Send cache
  //   cache <Object> { stats, compressed, data }
  sendCache(cache) {
    const res = this.res;
    res.statusCode = cache.statusCode;
    const { contentType, contentEncoding, stats } = cache;
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentEncoding) {
      res.setHeader('Content-Encoding', contentEncoding);
    }
    if (stats) {
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Last-Modified', stats.time);
    }
    this.end(cache.data);
  }

  // End request with HTTP error code
  //   code <number> HTTP status code
  //   err <Error> (optional)
  error(code, err = null) {
    this.res.statusCode = code;
    const errMessage = err ? err.code : undefined;
    const message = errMessage || STATUS_CODES[code] || 'Unknown error';
    if (this.typeExt === 'json') {
      this.end(`{"statusCode":${code},"message":${message}}`);
    } else {
      if (!this.res.headersSent) {
        this.res.setHeader('Content-Type', impress.MIME_TYPES.html);
      }
      const title = 'Error ' + code;
      const template = impress.systemTemplates.error;
      this.end(template(title, message));
    }
    this.application.log.error(`HTTP ${code} ${message} ${this.url}`);
  }

  // Redirect to specified location
  //   location <string> URL
  redirect(location) {
    if (!this.res.headersSent) {
      this.res.setHeader('Location', location);
      this.res.statusCode = 302;
    }
  }

  // Inherit behavior from parent directory
  //   callback <Function> after inherited handler
  //     err <Error>
  inherited(callback) {
    if (this.execPath === '/') {
      callback(new Error('Handler is not found'));
      return;
    }
    const path = api.common.dirname(this.execPath) + '/';
    this.execPath = path;
    this.execPathDir = api.path.join(this.application.dir, 'www', path);
    this.fileHandler(this.currentHandler, true, callback);
  }

  // File handler
  //   handler <string> access, get, post, put, delete, patch, head
  //   inheritance <boolean> flag, true if called from inherited
  //   callback <Function> after fileHandler executed
  //     err <Error>
  fileHandler(handler, inheritance, callback) {
    const application = this.application;

    const fileName = handler + '.js';
    const filePath = this.execPathDir + fileName;
    const relPath = application.relative(filePath);
    const fileCache = application.cache.files.get(relPath);

    if (!inheritance) this.currentHandler = handler;

    if (fileCache) {
      if (fileCache === impress.FILE_EXISTS) {
        this.runScript(handler, filePath, callback);
      } else if (this.execPath !== '/') {
        this.execPath = api.common.dirname(this.execPath);
        this.execPathDir = api.path.join(application.dir, 'www', this.execPath);
        this.fileHandler(handler, inheritance, callback);
      } else {
        callback(new Error('Handler not found'));
      }
      return;
    }
    api.fs.access(filePath, err => {
      if (!err) {
        application.cache.files.set(relPath, impress.FILE_EXISTS);
        this.runScript(handler, filePath, callback);
        application.cache.watch(api.path.dirname(relPath));
        return;
      }
      application.cache.files.set(relPath, impress.FILE_NOT_FOUND);
      if (this.execPath !== '/') {
        this.execPath = api.common.dirname(this.execPath);
        this.execPathDir = api.path.join(application.dir, 'www', this.execPath);
        this.fileHandler(handler, inheritance, callback);
        application.cache.watch('/www' + this.execPath);
        return;
      }
      application.cache.watch(api.path.dirname(relPath));
      callback(new Error('Handler not found'));
    });
  }

  // Find nearest existent folder
  //   callback <Function> after path detected
  detectRealPath(callback) {
    const application = this.application;

    let relPath = application.relative(this.realPathDir);
    const folderCache = application.cache.folders.get(relPath);

    const detected = folderCache &&
      folderCache !== impress.DIR_NOT_EXISTS ||
      this.realPath === '/';

    if (detected) {
      callback();
      return;
    }

    api.fs.access(this.realPathDir, err => {
      if (err) {
        application.cache.folders.set(relPath, impress.DIR_NOT_EXISTS);
        this.realPath = api.common.dirname(this.realPath);
        this.realPathDir = api.path.join(application.dir, 'www', this.realPath);
        relPath = application.relative(this.realPathDir);
        this.detectRealPath(callback);
      } else {
        application.cache.folders.set(relPath, impress.DIR_EXISTS);
        callback();
      }
      application.cache.watch(api.common.stripTrailingSlash(relPath));
    });
  }

  calculateAccess() {
    this.access.allowed = (
      (!this.logged && this.access.guests) ||
      (!!this.logged && this.access.logged)) && (
      (this.schema === 'http' && this.access.http) ||
      (this.schema === 'https' && this.access.https));
    if (this.logged) {
      this.access.allowed = this.access.allowed &&
        (!this.access.groups || (this.access.groups && (
          this.access.groups.length === 0 ||
          this.access.groups.includes(this.session.group) ||
          this.access.groups.includes('local') && this.local
        )));
    }
  }

  // Run script in client context
  //   handler <string> handler name
  //   fileName <string> file name
  //   callback <Function> after handler executed
  //     err <Error>
  runScript(handler, fileName, callback) {
    impress.createScript(this.application, fileName, (err, fn) => {
      if (err) {
        callback(err);
        return;
      }
      if (handler === 'access') {
        Object.assign(this.access, fn);
        this.calculateAccess();
        callback(null);
        return;
      }
      if (!this.access.allowed) {
        // TODO: check dead code
        callback(null);
        return;
      }
      this.executeFunction(fn, callback);
    });
  }

  // Execute function in client context
  //   fn <Function>
  //   callback <Function> after function executed
  //     err <Error>
  executeFunction(fn, callback) {
    const application = this.application;

    if (typeof fn !== 'function') {
      const err = new Error('Invalid handler');
      this.error(500);
      application.logException(err);
      callback(err);
      return;
    }

    let waiting = true;

    const done = (err, result) => {
      if (waiting) {
        waiting = false;
        if (result) this.context.data = result;
        if (err) {
          if (this.res.statusCode === 200) {
            this.error(500);
          }
          application.logException(err);
        }
        callback(null);
      }
    };

    if (Object.prototype.toString.call(fn) === '[object AsyncFunction]') {
      fn(this).then(result => {
        done(null, result);
      }, err => {
        done(err);
      });
      return;
    }
    try {
      fn(this, done);
    } catch (err) {
      done(err);
    }
  }

  // Send static file and close connection
  //   onNotServed // if not static
  static(onNotServed) {
    let relPath = '/static';
    if (this.path === '/') {
      relPath = api.path.join(relPath, 'index.html');
    } else {
      const url = api.querystring.unescape(this.url);
      relPath = api.path.join(relPath, url);
    }
    if (!this.staticCache(relPath, onNotServed)) {
      this.serveStatic(relPath, onNotServed);
    }
  }

  // Send static from cache
  //   relPath <string> relative path is a cash index
  //   onNotServed <Function>
  staticCache(relPath, onNotServed) {
    const cache = this.application.cache.static.get(relPath);
    const isNum = typeof cache === 'number';
    const cached = cache && !isNum;
    if (cached) this.buffer(cache);
    else if (isNum) onNotServed();
    return cached;
  }

  // Serve static file
  //   relPath <string> application relative path to file
  //   onNotServed <Function> if not static
  serveStatic(relPath, onNotServed) {
    const application = this.application;

    const gz = '.gz';
    const filePath = application.dir + relPath;
    const isCompressed = impress.COMPRESSED_EXT.includes(this.ext);

    const serveFile = (err, stats) => {
      if (err) {
        const isIndex = relPath.endsWith('/index.html');
        if (this.path !== '/' && isIndex) {
          this.index(api.path.dirname(filePath));
        } else {
          onNotServed();
        }
        application.cache.watch(api.path.dirname(relPath));
        return;
      }
      if (stats.isDirectory()) {
        relPath = api.path.join(relPath, 'index.html');
        if (!this.staticCache(relPath, onNotServed)) {
          this.serveStatic(relPath, onNotServed);
        }
        return;
      }
      const { cacheMaxFileSize } = application.config.sections.files;
      if (stats.size < cacheMaxFileSize) this.compress(filePath, stats);
      else this.stream(filePath, stats);
    };

    const serveGzip = (err, stats) => {
      if (err) api.fs.stat(filePath, serveFile);
      else this.staticFile(filePath + gz, relPath + gz, stats);
    };

    if (isCompressed) api.fs.stat(filePath, serveFile);
    else api.fs.stat(filePath + gz, serveGzip);
  }

  // Send compressed static file
  //   filePath <string> absolute path to file
  //   relPath <string> application relative path to file
  //   stats <Stats>
  staticFile(filePath, relPath, stats) {
    api.fs.readFile(filePath, (err, data) => {
      if (err) {
        this.error(404);
        return;
      }
      const cache = { stats, compressed: true, data };
      this.end(cache);
      this.application.cache.static.add(relPath, cache);
    });
  }

  // Send static buffer and drop connection
  //   cache <Object> { stats, compressed, data }
  //     stats <Stats> instance of fs.Stats
  //     compressed <boolean> gzip compression flag
  //     data <Buffer> to send
  buffer(cache) {
    const time = this.req.headers['if-modified-since'];
    const notMod = time && api.common.isTimeEqual(time, cache.stats.mtime);
    if (notMod) this.error(304);
    else this.end(cache);
  }

  // Refresh static in memory cache with compression and minification
  //   filePath <string> path to handler (from application base directory)
  //   stats <Stats> instance of fs.Stats
  compress(filePath, stats) {
    const time = this.req.headers['if-modified-since'];
    const notMod = time && api.common.isTimeEqual(time, stats.mtime);
    if (notMod) {
      this.error(304);
      return;
    }
    this.application.compress(filePath, stats, (err, data, compressed) => {
      if (err) {
        this.error(404);
        return;
      }
      this.end({ stats, compressed, data });
    });
  }

  // File upload and download utilities for Impress Application Server

  // Generate HTTP file attachment
  //   attachmentName <string> name to save downloaded file
  //   size <number> set Content-Length header (optional)
  //   lastModified <string> set Last-Modified header (optional)
  attachment(attachmentName, size, lastModified) {
    const res = this.res;
    res.setHeader('Content-Description', 'File Transfer');
    res.setHeader('Content-Type', 'application/x-download');
    const fileName = 'attachment; filename="' + attachmentName + '"';
    res.setHeader('Content-Disposition', fileName);
    res.setHeader('Expires', 0);
    const cacheControl = 'no-cache, no-store, max-age=0, must-revalidate';
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Pragma', 'no-cache');
    if (size) {
      res.setHeader('Content-Length', size);
      res.setHeader('Content-Transfer-Encoding', 'binary');
    }
    if (lastModified) res.setHeader('Last-Modified', lastModified);
  }

  // Download file
  //   filePath <string> file to download
  //   attachmentName <string> name to save downloaded file, optional
  //   callback <Function>
  download(filePath, attachmentName, callback) {
    if (typeof attachmentName === 'function') {
      callback = attachmentName;
      attachmentName = api.path.basename(filePath);
    }
    callback = api.common.once(callback);

    const fail = () => {
      this.application.log.error(impress.CANT_READ_FILE + filePath);
      this.error(404);
      callback();
    };

    api.fs.stat(filePath, (err, stats) => {
      if (err) {
        fail();
        return;
      }
      this.attachment(attachmentName, stats.size, stats.mtime.toGMTString());
      const stream = api.fs.createReadStream(filePath);
      stream.on('error', fail);
      this.res.on('finish', callback);
      stream.pipe(this.res);
    });
  }

  // Upload file
  //   each, <Function>(err, data) on processing each file
  //     data
  //       compressionFlag, originalName, storageName
  //       storagePath, originalHash, originalSize, storageSize
  //   callback <Function>(err, count)
  upload(each, callback) {
    if (!this.files) {
      callback(null, 0);
      return;
    }

    let fileCount = 0;
    let count = 0;

    const done = (err, data) => {
      count++;
      if (each) each(err, data);
      if (fileCount === count) callback(null, count);
    };

    for (const fieldName in this.files) {
      const field = this.files[fieldName];
      for (const key in field) {
        const file = field[key];
        fileCount++;
        impress.uploadFile(this.application, file, done);
      }
    }
  }

  // Sending file stream
  //   filePath <string> absolute path to file
  //   stats <Stats> instance of fs.Stats
  stream(filePath, stats) {
    const res = this.res;
    let stream;
    const range = this.req.headers.range;
    if (range) {
      const index = range.indexOf('-');
      const start = parseInt(range.slice('bytes='.length, index), 10);
      const end = index === range.length - 1 ?
        stats.size - 1 :
        parseInt(range.slice(index + 1), 10);
      const chunkSize = (end - start) + 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', stats.size);
      res.setHeader('Content-Length', chunkSize);
      const cRange = `bytes ${start}-${end}/${stats.size}`;
      res.setHeader('Content-Range', cRange);
      res.setHeader('Accept-Ranges', 'bytes');
      stream = api.fs.createReadStream(filePath, { start, end });
    } else {
      this.allowOrigin();
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Last-Modified', stats.mtime.toGMTString());
      stream = api.fs.createReadStream(filePath);
    }

    stream.on('open', () => {
      stream.pipe(this.res);
    });

    stream.on('error', () => {
      this.application.log.error(impress.CANT_READ_FILE + filePath);
    });
  }

  // Directory index
  //   indexPath <string> path to directory
  index(indexPath) {
    const application = this.application;

    if (!this.url.endsWith('/')) {
      this.redirect(this.path);
      this.end();
      return;
    }

    this.execPath = this.realPath;
    this.execPathDir = this.realPathDir;
    this.fileHandler('access', false, err => {
      if (err || !application.config.sections.files.index) {
        this.error(403);
        return;
      }
      if (!this.res.headersSent) {
        this.res.setHeader('Content-Type', impress.MIME_TYPES.html);
      }
      impress.dirIndex(
        application, indexPath, this.realPath, (err, files, dirs) => {
          const template = impress.systemTemplates.index;
          const fileTpl = impress.systemTemplates.file;
          const rows = files.map(
            ({ name, path, size, mtime }) => fileTpl(name, path, size, mtime)
          ).join('');
          const items = dirs.map(
            ({ name, path }) => `<a href="/${path}">${name}</a>`
          ).join('/');
          this.end(template('Directory index', this.url, rows, items));
        }
      );
    });
  }

  introspect() {
    if (!this.req.url.endsWith('/')) {
      this.redirect(this.path);
      this.end();
      return;
    }
    const application = this.application;
    const path = this.path;
    impress.dirIntrospect(application, path, (errCode, files, dirs) => {
      if (errCode) {
        this.error(errCode);
        return;
      }
      const template = impress.systemTemplates.introspection;
      const fileTpl = impress.systemTemplates.file;
      const rows = files.map(
        ({ name, path, method, mtime }) => fileTpl(name, path, method, mtime)
      ).join('');
      const items = dirs.map(
        ({ name, path }) => `<a href="/${path}">${name}</a>`
      ).join('/');
      this.end(template('API Introspection index', this.url, rows, items));
    });
  }

  // Render template from file or cache
  //   file <string> template file name
  //   callback <Function>(err <Error>, res <string>)
  template(file, callback) {
    const application = this.application;

    const fileName = file + '.template';
    const filePath = this.execPathDir + fileName;
    const relPath = application.relative(filePath);
    const fileCache = application.cache.templates.get(relPath);
    if (fileCache) {
      callback(null, fileCache);
      return;
    }
    api.fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        application.log.error(impress.CANT_READ_FILE + filePath);
        callback(err);
        return;
      }
      const tpl = api.common.removeBOM(data);
      application.cache.templates.add(relPath, tpl);
      callback(null, tpl);
    });
    application.cache.watch(api.path.dirname(relPath));
  }

}

impress.Client = Client;
