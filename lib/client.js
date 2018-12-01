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

if (!api.http.STATUS_CODES[508]) api.http.STATUS_CODES[508] = 'Loop Detected';

const TPL_NOT_FOUND = 'Warning: template not found: ';

class Client {

  // Client constructor
  //   application <Object>
  //   req <IncomingMessage>
  //   res <ServerResponse>
  constructor(application, req, res) {
    const socket = req.socket || req.connection.socket;
    const server = impress.servers[socket.server.serverName];
    const url = api.url.parse(req.url);

    req.connection.client = this;

    this.startTime = Date.now();
    this.req = req;
    this.res = res;
    this.socket = socket;
    this.server = server;
    this.application = application;
    this.dynamicHandler = false;
    this.query = api.querystring.parse(url.query);
    this.schema = server.config.transport === 'tls' ? 'https' : 'http';
    this.method = req.method.toLowerCase();
    this.access = Object.assign({}, DEFAULT_ACCESS);
    this.calculateAccess();
    this.parameters = req.parameters || {};
    Object.assign(this.parameters, this.query);
    this.slowTime = server.config.slowTime;
    this.timedOut = false;
    this.finished = false;
    this.url = url.pathname;
    this.host = api.common.parseHost(req.headers.host);
    this.path = api.common.addTrailingSlash(this.url);
    this.pathDir = application.dir + '/www' + this.path;
    this.realPath = this.path;
    this.realPathDir = this.pathDir;
    this.execPath = this.path;
    this.execPathDir = this.pathDir;
    this.ext = api.common.fileExt(this.path);
    this.typeExt = this.ext || 'html';
    this.data = ''; // data received from client
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
      const timeout = Math.round(server.config.keepAlive / 1000);
      res.setHeader('Keep-Alive', 'timeout=' + timeout);
    }
    if (this.ip) {
      const ip = api.net.isIPv6(this.ip) ? this.ip.slice(7) : this.ip;
      this.ipInt = api.common.ipToInt(ip);
      application.emit('clientConnect', this);
      this.local = api.common.localIPs().includes(this.ip);
    }

    // Socket leak workaround
    res.on('finish', () => {
      application.emit('clientDisconnect', this);
      socket.removeAllListeners('timeout');
      socket.setTimeout(server.config.keepAlive, () => {
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
    const application = this.application;

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
      if (application) {
        impress.log.error('Error proxying request: ' + err.message);
      }
    });
    req.end();
    impress.stat.res++;
  }

  dispatch() {
    this.dynamicHandler = true;
    this.parseCookies();
    const code = api.firewall.check(this);
    if (code === api.firewall.ACCESS_ALLOWED) {
      this.restoreSession(() => {
        this.detectRealPath(() => {
          this.processing();
        });
      });
    } else if (code === api.firewall.ACCESS_DENIED) {
      this.error(403);
    } else if (code === api.firewall.ACCESS_LIMITED) {
      this.error(429);
    } else {
      this.error(400);
    }
  }

  // Add current client to deny list by IP and SID (if session exists)
  block(msec) {
    this.error(403);
    const duration = api.common.duration(msec) || 0;
    api.firewall.ip.deny(this.ipInt, duration);
    if (this.sid) api.firewall.sid.deny(this.sid, duration);
  }

  startSession() {
    const application = this.application;

    if (application && !this.session) {
      this.sid = api.common.generateSID(application.config.sections.sessions);
      this.user = null;
      this.session = application.security.session({ sid: this.sid });
      this.sessionModified = true;
      this.sessionCreated = true;
      this.setCookie(
        application.config.sections.sessions.cookie,
        this.sid,
        application.config.sections.sessions.domain
      );
      if (impress.config.sections.scale.cookie) {
        this.setCookie(impress.config.sections.scale.cookie, impress.nodeId);
      }
      application.sessions.set(this.sid, this.session);
    }
  }

  destroySession() {
    const application = this.application;

    if (application && this.session) {
      this.deleteCookie(
        application.config.sections.sessions.cookie,
        application.config.sections.sessions.domain
      );
      this.deleteCookie(
        impress.config.sections.scale.cookie,
        application.config.sections.sessions.domain
      );
      const login = this.session.login;
      if (login) {
        const user = application.users.get(login);
        if (user) delete user.sessions[this.sid];
      }
      application.sessions.delete(this.sid);
      application.security.deleteSession(this.sid);
      this.sid = null;
      this.user = null;
      this.session = null;
    }
  }

  // Restore session
  //   callback <Function>(err, session) call after session restored
  restoreSession(callback) {
    const application = this.application;

    const sid = this.cookies[application.config.sections.sessions.cookie];

    if (!application || !sid) {
      callback();
      return;
    }

    const session = application.sessions.get(sid);
    if (session) {
      this.setSession(sid, session);
      callback();
      return;
    }
    const valid = api.common.validateSID(
      application.config.sections.sessions, sid
    );
    if (!valid) {
      this.deleteCookie(application.config.sections.sessions.cookie);
      callback();
      return;
    }
    const persist = application.config.sections.sessions.persist;
    if (!persist) {
      callback();
      return;
    }
    application.security.readSession(sid, (err, session) => {
      if (err || !session) {
        this.deleteCookie(application.config.sections.sessions.cookie);
        callback(new Error('Session not found'));
        return;
      }
      this.setSession(sid, session);
      application.sessions.set(sid, session);
      const login = session.login;
      if (login) {
        const user = application.users.get(login);
        if (user) user.sessions.push(sid);
      }
      callback(null, session);
    });
  }

  // Set session
  //   sid <string> session identifier
  //   session <Object> session fields
  setSession(sid, session) {
    const application = this.application;

    this.sid = sid;
    this.session = session;
    this.logged = !!this.session.login;
    this.user = application.security.getSessionUser(sid);
    application.emit('clientSession', this);
  }

  saveSession(callback) {
    const application = this.application;

    const done = () => {
      this.sessionCreated = false;
      this.sessionModified = false;
      callback();
    };

    if (!application) {
      callback();
      return;
    }
    const cfg = application.config.sections.sessions;
    if (cfg && cfg.persist && this.session) {
      if (this.sessionCreated) {
        application.security.createSession(this.session, done);
        return;
      }
      if (this.sessionModified) {
        application.security.updateSession(this.session, done);
        return;
      }
    }
    callback();
  }

  processing() {
    const application = this.application;

    const cache = application.cache.pages[this.realPath];
    if (cache && this.startTime < cache.expireTime) {
      this.sendCache(cache);
      return;
    }

    if (!this.ext) {
      this.ext = api.common.fileExt(this.realPath);
      this.typeExt = this.ext || 'html';
    }

    const handlers = ['access', 'request', this.method, 'end', 'lazy'];
    this.context = {};

    if (this.res.setHeader && !this.res.headersSent) {
      this.defaultContentType();
    }

    if (this.ext === 'ws') {
      api.websocket.initialize(this);
    }

    // Execute handlers
    api.metasync.series(handlers, (handler, cb) => {
      if (
        handler === 'access' ||
        this.access.virtual ||
        this.path === this.realPath
      ) {
        this.execPath = this.realPath;
        this.execPathDir = this.realPathDir;
        this.fileHandler(handler, false, cb);
      } else {
        this.error(404);
        // TODO: don't create new Error(<number>)
        // TODO: don't handle errors twice
        cb(new Error(404));
      }
    }, err => {
      if (!err && !this.res.headersSent) {
        if (!this.access.allowed) {
          this.error(403);
          return;
        }
        if (this.access.auth && !this.local) {
          this.basicAuth();
          return;
        }
        if (this.ext === '' && this.access.intro) {
          this.introspect();
        } else {
          const extCase = impress.extensions[this.typeExt] ||
            impress.extensions.html;
          if (extCase) extCase(this);
          else this.error(404);
        }
      }
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

  defaultContentType() {
    const contentType = impress.MIME_TYPES[this.typeExt];
    if (contentType) {
      this.res.setHeader('Content-Type', contentType);
    }
    const appConfig = this.application.config.sections.application;
    if (appConfig) {
      const allowOrigin = appConfig.allowOrigin;
      if (allowOrigin) {
        this.res.setHeader(
          'Access-Control-Allow-Origin', allowOrigin
        );
        this.res.setHeader(
          'Access-Control-Allow-Headers', 'origin, content-type, accept'
        );
      }
    }
  }

  processingPage() {
    const data = this.context.data || {};
    this.execPath = this.realPath;
    this.execPathDir = this.realPathDir;
    this.template(data, 'html', '', (err, tpl) => {
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

    this.saveSession(() => {
      this.sendCookie();
      if (!this.res.headersSent) {
        if (cache.stats) {
          this.res.setHeader('Content-Length', cache.stats.size);
          this.res.setHeader('Last-Modified', cache.stats.mtime.toGMTString());
        }
        if (cache.compressed) this.res.setHeader('Content-Encoding', 'gzip');
      }
      if (isString && length > impress.COMPRESS_ABOVE) {
        api.zlib.gzip(cache.data, (err, data) => {
          if (err) {
            this.error(500, err);
            return;
          }
          if (this.res.headersSent || !this.res.setHeader) {
            this.res.end();
          } else {
            this.res.setHeader('Content-Encoding', 'gzip');
            this.res.setHeader('Content-Length', data.length);
            this.res.end(data);
            if (this.context && this.context.cache) this.saveCache(data);
          }
        });
      } else {
        this.res.end(cache.data);
        if (this.context && this.context.cache) this.saveCache(cache.data);
      }
      if (this.application) this.application.accessLog(this);
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
    this.res.statusCode = cache.statusCode;
    if (cache.contentType) {
      this.res.setHeader('Content-Type', cache.contentType);
    }
    if (cache.contentEncoding) {
      this.res.setHeader('Content-Encoding', cache.contentEncoding);
    }
    if (cache.stats) {
      this.res.setHeader('Content-Length', cache.stats.size);
      this.res.setHeader('Last-Modified', cache.stats.time);
    }
    this.end(cache.data);
  }

  // End request with HTTP error code
  //   code <number> HTTP status code
  //   err <Error> (optional)
  error(code, err) {
    const application = this.application;

    if (err) this.err = err;
    this.res.statusCode = code;
    this.fileHandler('error', false, () => {
      if (code === 304) {
        this.end();
        return;
      }
      const message = api.http.STATUS_CODES[code] || 'Unknown error';
      if (this.typeExt === 'json') {
        this.end(`{"statusCode":${code}}`);
      } else {
        if (this.res.headersSent === false) {
          this.res.setHeader('Content-Type', impress.MIME_TYPES.html);
        }
        const data = { title: 'Error ' + code, message };
        const template = application.systemTemplates.error || '';
        this.include(data, template, '', (err, tpl) => {
          this.end(tpl);
        });
      }
      impress.log.error(`HTTP ${code}\t${message}\t${this.url}`);
    });
  }

  // Redirect to specified location
  //   location <string> URL
  redirect(location) {
    if (this.res.setHeader && !this.res.headersSent) {
      this.res.setHeader('Location', location);
      this.res.statusCode = 302;
    }
  }

  // Inherit behavior from parent directory
  //   callback <Function> after inherited handler
  inherited(callback) {
    if (this.execPath !== '/' && this.currentHandler !== 'meta') {
      this.execPath = api.common.dirname(this.execPath) + '/';
      this.execPathDir = this.application.dir + '/www' + this.execPath;
      this.fileHandler(this.currentHandler, true, callback);
    }
  }

  // File handler
  //   handler <string> handler file name: access, request, end, lazy, error
  //     and HTTP methods: get, post, put, delete, patch, head, options
  //   inheritance <boolean> flag, true if called from inherited
  //   callback <Function> after fileHandler executed
  fileHandler(handler, inheritance, callback) {
    const application = this.application;

    const fileName = handler + '.js';
    const filePath = this.execPathDir + fileName;
    const relPath = application.relative(filePath);
    const fileCache = application.cache.files.get(relPath);

    if (!inheritance) {
      this.currentHandler = handler;
    }
    if (fileCache) {
      if (fileCache !== impress.FILE_EXISTS) callback();
      else this.runScript(handler, filePath, callback);
      return;
    }
    api.fs.access(filePath, err => {
      if (!err) {
        this.runScript(handler, filePath, callback);
        if (!inheritance) {
          application.cache.files.set(relPath, impress.FILE_EXISTS);
        }
        application.cache.watch(api.path.dirname(relPath));
      } else if (this.execPath !== '/' && handler !== 'meta') {
        // Try to process request on parent directory
        this.execPath = api.common.dirname(this.execPath);
        this.execPathDir = application.dir + '/www' + this.execPath;
        this.fileHandler(handler, inheritance, callback);
        application.cache.watch('/www' + this.execPath);
      } else {
        // Lose hope to execute request and drop connection
        if (!inheritance) {
          application.cache.files.set(relPath, impress.FILE_NOT_FOUND);
        }
        application.cache.watch(api.path.dirname(relPath));
        callback();
      }
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
        this.realPathDir = application.dir + '/www' + this.realPath;
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
          this.access.groups.includes(this.user.group) ||
          this.access.groups.includes('local') && this.local
        )));
    }
  }

  // Run script in client context
  //   handler <string> handler name
  //   fileName <string> file name
  //   callback <Function> after handler executed
  runScript(handler, fileName, callback) {
    impress.createScript(this.application, fileName, (err, fn) => {
      if (err) {
        this.err = err;
        callback();
        return;
      }
      if (handler === 'access') {
        // fn is an object here, not function
        Object.assign(this.access, fn);
        this.calculateAccess();
        callback();
        return;
      }
      if (!this.access.allowed || !this.application) {
        callback();
        return;
      }
      // save link to client { req, res }
      if (handler === 'lazy') {
        setImmediate(() => {
          this.executeFunction(fn, api.common.emptiness);
        });
        callback();
      } else {
        this.executeFunction(fn, callback);
      }
    });
  }

  // Execute function in client context
  //   fn <Function>
  //   callback <Function> after function executed
  executeFunction(fn, callback) {
    const application = this.application;

    if (fn && fn.meta) {
      const vd = api.definition.validate(
        this.parameters, fn.meta, 'parameters', true
      );
      if (!vd.valid) {
        this.context.data = fn.meta;
        this.error(400);
        callback();
        return;
      }
    }

    const isFn = typeof fn === 'function';
    if (!isFn || fn.length < 2 || fn.length > 3) {
      const err = new Error('Invalid handler');
      this.error(500, err);
      application.logException(err);
      callback();
      return;
    }

    let waiting = true;

    const done = (err, result) => {
      if (waiting) {
        waiting = false;
        if (result) this.context.data = result;
        if (err) {
          if (this.res.statusCode === 200) {
            this.error(500, err);
          }
          application.logException(err);
          return;
        }
        callback();
      }
    };

    try {
      fn(this, done);
    } catch (err) {
      this.error(500, err);
      application.logException(err);
      callback();
    }
  }

  // Send static file and close connection
  //   onNotServed // if not static
  static(onNotServed) {
    let relPath = '/static';
    if (this.path === '/') relPath += '/index.html';
    else relPath += api.querystring.unescape(this.url);
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
        application.cache.watch(api.path.dirname(relPath));
        const isIndex = relPath.endsWith('/index.html');
        if (this.path !== '/' && isIndex) {
          this.index(api.path.dirname(filePath));
        } else {
          onNotServed();
        }
      } else if (stats.isDirectory()) {
        relPath += '/index.html';
        if (!this.staticCache(relPath, onNotServed)) {
          this.serveStatic(relPath, onNotServed);
        }
      } else {
        const { cacheMaxFileSize } = application.config.sections.files;
        if (stats.size < cacheMaxFileSize) {
          this.compress(filePath, stats);
        } else {
          this.stream(filePath, stats);
        }
      }
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

  // Sign in
  //   login <string>
  //   password <string>
  //   callback <Function> (err, user)
  signIn(login, password, callback) {
    this.application.security.signIn(login, password, (err, user) => {
      if (!user) {
        callback(null, false);
        return;
      }
      this.startSession();
      if (!this.application.users.has(user.login)) {
        this.application.users.set(user.login, user);
      }
      this.session.login = user.login;
      if (user.group) this.session.group = user.group;
      this.sessionModified = true;
      this.logged = true;
      callback(null, true);
    });
  }

  // Sign out
  //   callback <Function>
  //     isSuccess <boolean>
  signOut(callback) {
    if (!this.session) {
      callback(null, false);
      return;
    }
    const login = this.session.login;
    if (login) {
      const user = this.application.users.get(login);
      if (user && user.sessions) {
        delete user.sessions[this.sid];
      }
    }
    if (this.session.login) {
      this.session.login = null;
    }
    if (this.session.group) {
      this.session.group = null;
    }
    this.sessionModified = true;
    this.logged = false;
    this.user = null;
    callback(null, true);
  }

  // Sign up
  //   login <string>
  //   password <string>
  //   callback <Function>(err, success)
  signUp(login, password, callback) {
    this.application.security.signUp(login, password, (err, user) => {
      if (user) {
        this.startSession();
        this.session.login = login;
        this.sessionModified = true;
        this.logged = true;
        this.application.users.set(login, user);
      }
      callback(err, !!user);
    });
  }

  // Get user
  //   login <string>
  //   callback <Function>(err, user)
  getUser(login, callback) {
    // TODO: check callback contract
    this.application.security.getUser(login, callback);
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
      impress.log.error(impress.CANT_READ_FILE + filePath);
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
    callback = api.common.once(callback);
    if (!this.files) {
      callback(null, 0);
      return;
    }

    let fileCount = 0;
    let count = 0;

    const cb = (err, data) => {
      count++;
      if (each) each(err, data);
      if (fileCount === count) callback(null, count);
    };

    for (const fieldName in this.files) {
      const field = this.files[fieldName];
      for (const key in field) {
        const file = field[key];
        fileCount++;
        impress.uploadFile(this.application, file, cb);
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
      const bytes = range.replace(/bytes=/, '').split('-');
      const start = parseInt(bytes[0], 10);
      const end = bytes[1] ? parseInt(bytes[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', stats.size);
      res.setHeader('Content-Length', chunkSize);
      const cRange = `bytes ${start}-${end}/${stats.size}`;
      res.setHeader('Content-Range', cRange);
      res.setHeader('Accept-Ranges', 'bytes');
      stream = api.fs.createReadStream(filePath, { start, end });
    } else {
      const appConfig = this.application.config.sections.application;
      if (appConfig) {
        const allowOrigin = appConfig.allowOrigin;
        if (allowOrigin) {
          res.setHeader('Access-Control-Allow-Origin', allowOrigin);
          const headers = 'origin, content-type, accept';
          res.setHeader('Access-Control-Allow-Headers', headers);
        }
      }
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Last-Modified', stats.mtime.toGMTString());
      stream = api.fs.createReadStream(filePath);
    }

    stream.on('open', () => {
      stream.pipe(this.res);
    });

    stream.on('error', () => {
      impress.log.error(impress.CANT_READ_FILE + filePath);
    });
  }

  // Directory index (genetrate HTML page based on /templates/index.template)
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
    this.fileHandler('access', false, () => {
      if (!application.config.sections.files.index) {
        this.error(403);
        return;
      }
      if (!this.res.headersSent) {
        this.res.setHeader('Content-Type', impress.MIME_TYPES.html);
      }
      impress.dirIndex(indexPath, this.realPath, (err, files, dirs) => {
        const data = {
          title: 'Directory index', path: this.url, files, dirs
        };
        const template = application.systemTemplates.index;
        this.include(data, template, '', (err, tpl) => {
          this.end(tpl);
        });
      });
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
      const data = {
        title: 'API Introspection index', path: this.url, files, dirs
      };
      const template = application.systemTemplates.introspection;
      this.include(data, template, '', (err, tpl) => {
        this.end(tpl);
      });
    });
  }

  // Render template from file or cache
  //   data <object> object with data to be rendered using given template
  //   file <string> file name to read template in Impress format
  //   cursor <string> dot-separated path in data object
  //   callback <Function>(err, s), s is rendered string
  template(data, file, cursor, callback) {
    const application = this.application;

    let fileName, filePath, fileCache, relPath;
    const files = [];
    if (file.includes('.')) {
      filePath = api.path.normalize(this.execPathDir + file);
      filePath = filePath.replace(/\\/g, '/');
      relPath = application.relative(filePath);
      this.include(data, filePath, cursor, callback);
      return;
    }
    if (this.logged) {
      if (this.user && this.user.group) {
        files.push(file + '.' + this.user.group);
      }
      files.push(file + '.everyone');
    }
    files.push(file);
    // Detect cache or file exists
    api.metasync.find(files, (item, cb) => {
      fileName = item + '.template';
      filePath = this.execPathDir + fileName;
      relPath = application.relative(filePath);
      fileCache = application.cache.files.get(relPath);
      if (fileCache === impress.FILE_EXISTS) {
        cb(null, true);
      } else {
        api.fs.access(filePath, err => {
          cb(null, !err);
        });
      }
    }, (err, result) => {
      if (fileCache) {
        if (fileCache === impress.FILE_EXISTS) {
          this.include(data, filePath, cursor, callback);
        } else {
          callback(null, TPL_NOT_FOUND + relPath);
        }
      } else if (result) {
        this.include(data, filePath, cursor, callback);
        application.cache.files.set(relPath, impress.FILE_EXISTS);
        application.cache.watch(api.path.dirname(relPath));
      } else if (!['/', '/www', '.'].includes(this.execPath)) {
        // Try to find template in parent directory
        this.execPath = api.common.dirname(this.execPath);
        this.execPathDir = application.dir + '/www' + this.execPath;
        this.template(data, file, cursor, callback);
        application.cache.watch(
          '/www' + api.common.stripTrailingSlash(this.execPath)
        );
      } else {
        // Lose hope to find template and save cache
        application.cache.files.set(relPath, impress.FILE_NOT_FOUND);
        application.cache.watch(relPath);
        callback(null, impress.TPL_NOT_FOUND + relPath);
      }
    });
  }

  // Include template
  //   data <Object> with data to be rendered using given template
  //   filePath <string> application relative path to read template
  //   cursor <string> dot-separated path in data object
  //   callback <Function>(err, s), s is rendered string
  include(data, filePath, cursor, callback) {
    const application = this.application;

    const relPath = application.relative(filePath);
    const cache = application ? application.cache.templates.get(relPath) : null;
    if (cache) {
      if (cache === impress.FILE_IS_EMPTY) callback(null, '');
      else this.render(data, cache, cursor, callback);
      return;
    }
    api.fs.readFile(filePath, 'utf8', (err, tpl) => {
      if (err) {
        callback(null, impress.TPL_NOT_FOUND + filePath);
        return;
      }
      if (!tpl) {
        tpl = impress.FILE_IS_EMPTY;
      } else {
        tpl = api.common.removeBOM(tpl);
        if (!tpl) tpl = impress.FILE_IS_EMPTY;
      }
      if (application) application.cache.templates.set(relPath, tpl);
      this.render(data, tpl, cursor, callback);
    });
    filePath = application.relative(api.path.dirname(filePath));
    application.cache.watch(filePath);
  }

  // Render template from variable
  //   data <Object> with data to be rendered using given template
  //   tpl <string> template in Impress format
  //   cursor <string> dot-separated path in data object/hash
  //   callback <Function>(err, s), s is rendered string
  render(data, tpl, cursor, callback) {
    if (tpl === impress.FILE_IS_EMPTY) {
      callback(null, '');
      return;
    }
    const doc = impress.parseTemplate(data, tpl, cursor);
    let result = '';

    const iterate = (item, next) => {
      let cursorNew;
      if (item.type === 'plain') {
        result += api.common.subst(item.tpl, data, cursor);
        next();
      } else if (item.type === 'inline') {
        cursorNew = cursor === '' ? item.name : cursor + '.' + item.name;
        this.render(data, item.tpl, cursorNew, (err, tpl) => {
          result += tpl;
          next();
        });
      } else if (item.type === 'include') {
        cursorNew = cursor === '' ? item.name : cursor + '.' + item.name;
        this.execPath = this.realPath;
        this.execPathDir = this.realPathDir;
        this.template(data, item.name, cursorNew, (err, tpl) => {
          if (tpl !== impress.FILE_IS_EMPTY) {
            result += tpl || impress.TPL_NOT_FOUND + item.name;
          }
          next();
        });
      }
    };

    const done = () => {
      callback(null, result);
    };

    api.metasync.series(doc, iterate, done);
  }

}

impress.Client = Client;
