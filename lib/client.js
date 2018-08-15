'use strict';

// HTTP Client interface for Impress Application Server

const COOKIES_EXPIRES = (
  '=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain='
);

const REGEXP_IPV4_TO_IPV6 = new RegExp('^[:f]*', 'g');

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

const Client = function(
  application, // instance of application
  req, // instance of http.IncomingMessage
  res // instance of http.ServerResponse
) {
  const socket = req.socket || req.connection.socket;
  const server = impress.config.servers[socket.server.serverName];
  const url = api.url.parse(req.url);

  req.connection.client = this;

  this.startTime = Date.now();
  this.req = req;
  this.res = res;
  this.socket = socket;
  this.server = server;
  this.dynamicHandler = false;
  this.application = application;
  this.query = api.querystring.parse(url.query);
  this.schema = server.transport === 'tls' ? 'https' : 'http';
  this.method = req.method.toLowerCase();
  this.access = Object.assign({}, DEFAULT_ACCESS);
  this.calculateAccess();
  this.parameters = req.parameters || {};
  Object.assign(this.parameters, this.query);
  this.slowTime = server.slowTime;
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
  this.ip = (
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    socket.remoteAddress
  );
  this.cookies = {}; // received cookies
  this.preparedCookies = []; // cookies to send

  if (res.setHeader) {
    const contentType = impress.MIME_TYPES[this.typeExt];
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public');
    res.setHeader('Keep-Alive', 'timeout=' + ~~(server.keepAlive / 1000));
  }
  if (this.ip) {
    this.ip = this.ip.replace(REGEXP_IPV4_TO_IPV6, '');
    this.ipInt = api.common.ipToInt(this.ip);
    application.emit('clientConnect', this);
    this.local = api.common.localIPs().includes(this.ip);
  }

  // Socket leak workaround
  res.on('finish', () => {
    application.emit('clientDisconnect', this);
    socket.removeAllListeners('timeout');
    socket.setTimeout(server.keepAlive, () => {
      socket.destroy();
    });
  });
};

impress.Client = Client;

const extCases = {

  html: (client) => {
    if (typeof client.context.data === 'string') {
      client.end(client.context.data);
    } else {
      client.processingPage();
    }
  },

  sse: (client) => {
    if (!client.application.sse) {
      client.error(510);
      return;
    }
    client.sseConnect();
  },

  ws: (client) => {
    if (!client.application.websocket) {
      client.error(510);
      return;
    }
    client.application.websocket.finalize(client);
  },

  json: (client) => {
    if (!client.context.data) {
      client.error(400);
      return;
    }
    client.end(api.json.stringify(client.context.data));
  },

  jsonp: (client) => {
    if (!client.context.data) {
      client.error(400);
      return;
    }
    const jsonpCallbackName = (
      client.query.callback || client.query.jsonp || 'callback'
    );
    const data = api.json.stringify(client.context.data);
    client.end(jsonpCallbackName + '(' + data + ');');
  },

  csv: (client) => {
    if (!client.context.data) {
      client.error(400);
      return;
    }
    api.csv.stringify(client.context.data, (err, data) => {
      if (err) {
        client.error(500, err);
        return;
      }
      client.end(data);
    });
  }

};

Client.prototype.accessLog = function() {
  const application = this.application;

  if (application) {
    this.endTime = Date.now();
    let location = '-';
    if (api.geoip) {
      const geo = api.geoip.lookup(this.ip);
      if (geo) location = geo.country + '/' + geo.region + '/' + geo.city;
    }
    const msg = (
      application.name + '\t' +
      (this.endTime - this.startTime) + 'ms\t' +
      this.ip + '\t' +
      location + '\t' +
      ((this.user ? this.user.login : '-') || '-') + '\t' +
      (this.sid || '-') + '\t' +
      this.socket.bytesRead + '\t' +
      this.socket.bytesWritten + '\t' +
      this.req.method + '\t' +
      this.res.statusCode + '\t' +
      this.schema + '://' + this.req.headers.host + this.url + '\t' +
      (this.req.headers['user-agent'] || '-')  + '\t' +
      (this.req.headers['referer'] || '-')
    );
    impress.log.access(msg);
    if (this.endTime - this.startTime >= this.slowTime) {
      impress.log.slow(msg);
    }
  }
};

Client.prototype.fork = function(
  // Fork long worker
  workerFile // handler to be executed in forked process
) {
  const application = this.application;
  const user = this.user;

  if (application) {
    const clientData = {
      url: this.url,
      query: this.query,
      sid: this.sid,
      session: this.session,
      context: this.context,
      fields: this.fields,
      parameters: this.parameters,
      user: null
    };
    if (user) clientData.user = {
      login: user.login,
      access: user.access,
      data: user.data
    };
    const fileName = this.pathDir + workerFile + '.js';
    impress.forkLongWorker(
      application.name,
      fileName,
      api.json.stringify(clientData)
    );
  }
};

Client.prototype.killLongWorker = function(
  // Kill long worker
  workerFile // name of handler file to identify process
) {
  const fileName = this.pathDir + workerFile + '.js';
  if (this.application) {
    impress.killLongWorker(this.application.name, fileName);
  }
};

Client.prototype.parseCookies = function() {
  const cookies = this.req.headers.cookie;
  let parts, key;
  if (cookies) {
    cookies.split(';').forEach((cookie) => {
      parts = cookie.split('=');
      key = parts[0].trim();
      this.cookies[key] = (parts[1] || '').trim();
    });
  }
};

Client.prototype.setCookie = function(
  name, // cookie name
  value, // cookie value
  host, // host name (optional)
  httpOnly // boolean HttpOnly cookie modifier (optional)
) {
  const expires = new Date(2100, 1, 1).toUTCString();
  host = host || this.req.headers.host;
  const pos = host.indexOf(':');
  if (pos > -1) host = host.substring(0, pos);
  if (httpOnly === undefined) httpOnly = true;
  this.preparedCookies.push(
    name + '=' + value + '; expires=' + expires +
    '; Path=/; Domain=' + host + (httpOnly ? '; HttpOnly' : '')
  );
};

Client.prototype.deleteCookie = function(
  name, // cookie name
  host // host name
) {
  let aHost = host || this.req.headers.host;
  if (api.net.isIP(aHost) === 0) aHost = '.' + aHost;
  this.preparedCookies.push(name + COOKIES_EXPIRES + aHost);
};

Client.prototype.sendCookie = function() {
  const pc = this.preparedCookies;
  if (pc && pc.length && !this.res.headersSent) {
    this.res.setHeader('Set-Cookie', pc);
  }
};

Client.prototype.proxy = function(
  // Route request to external HTTP server
  hostname, // forward request to nost name or IP address
  port, // request port number (number)
  path // request URL string
) {
  const application = this.application;

  const target = { hostname, port, path, method: this.req.method };
  const req = api.http.request(target, (response) => {
    this.res.writeHead(response.statusCode, response.headers);
    response.on('data', chunk => {
      this.res.write(chunk);
    });
    response.on('end', () => {
      this.end();
    });
  });
  req.on('error', (err) => {
    if (application) {
      impress.log.error('Error proxying request: ' + err.message);
    }
  });
  req.end();
  impress.stat.res++;
};

Client.prototype.dispatch = function() {
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
};

Client.prototype.block = function(
  msec // Add current client to deny list by IP and SID (if session exists)
) {
  this.error(403);
  msec = api.common.duration(msec) || 0;
  api.firewall.ip.deny(this.ipInt, msec);
  if (this.sid) api.firewall.sid.deny(this.sid, msec);
};

Client.prototype.startSession = function() {
  const application = this.application;

  if (application && !this.session) {
    this.sid = api.common.generateSID(application.config.sessions);
    this.user = null;
    this.session = application.security.session({ sid: this.sid });
    this.sessionModified = true;
    this.sessionCreated = true;
    this.setCookie(
      application.config.sessions.cookie,
      this.sid,
      application.config.sessions.domain
    );
    if (impress.config.scale.cookie) {
      this.setCookie(impress.config.scale.cookie, impress.nodeId);
    }
    application.sessions.set(this.sid, this.session);
  }
};

Client.prototype.destroySession = function() {
  const application = this.application;

  if (application && this.session) {
    this.deleteCookie(
      application.config.sessions.cookie,
      application.config.sessions.domain
    );
    this.deleteCookie(
      impress.config.scale.cookie,
      application.config.sessions.domain
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
};

Client.prototype.restoreSession = function(
  callback // function(err, session) call after session restored
) {
  const application = this.application;

  const sid = this.cookies[application.config.sessions.cookie];

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
  const valid = api.common.validateSID(application.config.sessions, sid);
  if (!valid) {
    this.deleteCookie(application.config.sessions.cookie);
    callback();
    return;
  }
  const persist = application.config.sessions.persist;
  if (!persist) {
    callback();
    return;
  }
  application.security.readSession(sid, (err, session) => {
    if (err || !session) {
      this.deleteCookie(application.config.sessions.cookie);
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
};

Client.prototype.setSession = function(
  sid, // session identifier
  session // object/hash with session fields
) {
  const application = this.application;

  this.sid = sid;
  this.session = session;
  this.logged = !!this.session.login;
  this.user = application.security.getSessionUser(sid);
  application.emit('clientSession', this);
};

Client.prototype.saveSession = function(callback) {
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
  const cfg = application.config.sessions;
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

};

Client.prototype.processing = function() {
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

  if (this.typeExt === 'sse') {
    this.eventChannel = null;
  } else if (this.res.setHeader && !this.res.headersSent) {
    this.defaultContentType();
  }

  if (this.ext === 'ws' && application.websocket) {
    application.websocket.initialize(this);
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
      cb(new Error(404));
    }
  }, (err) => {
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
        const extCase = extCases[this.typeExt] || extCases.html;
        if (extCase) extCase(this);
        else this.error(404);
      }
    }
  });
};

Client.prototype.basicAuth = function() {
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
};

Client.prototype.defaultContentType = function() {
  const application = this.application;

  const contentType = impress.MIME_TYPES[this.typeExt];
  if (contentType) {
    this.res.setHeader('Content-Type', contentType);
  }
  const allowOrigin = api.common.getByPath(
    application.config,
    'application.allowOrigin'
  );
  if (allowOrigin) {
    this.res.setHeader(
      'Access-Control-Allow-Origin', allowOrigin
    );
    this.res.setHeader(
      'Access-Control-Allow-Headers', 'origin, content-type, accept'
    );
  }
};

Client.prototype.processingPage = function() {
  const data = this.context.data || {};
  this.execPath = this.realPath;
  this.execPathDir = this.realPathDir;
  this.template(data, 'html', '', tpl => {
    this.end(tpl);
  });
};

Client.prototype.cache = function(
  // Cache URL response
  timeout // number of milliseconds or string duration e.g. '10h 30m' or '30s'
) {
  this.context.cache = api.common.duration(timeout);
};

Client.prototype.end = function(
  // End request
  output // string or Buffer or cache: { stats, compressed, data }
) {
  const isString = typeof output === 'string';
  const isBuffer = output instanceof Buffer;
  const isUndef = output === undefined;
  const cache = (isString || isBuffer || isUndef) ? { data: output } : output;
  const length = (cache && cache.data) ? cache.data.length : 0;

  this.finished = true;
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
    this.accessLog();
    impress.stat.res++;
  });
};

Client.prototype.saveCache = function(
  data // reply (string)
) {
  const application = this.application;

  const now = new Date();
  const mtime = now.getTime();
  const time = now.toGMTString();

  application.cache.pages[this.realPath] = {
    expireTime: this.startTime + this.context.cache,
    statusCode: this.res.statusCode,
    contentType: this.res.getHeader('content-type'),
    contentEncoding: this.res.getHeader('content-encoding'),
    stats: { size: data.length, mtime, time },
    data
  };
};

Client.prototype.sendCache = function(
  cache // structure { stats, compressed, data }
) {
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
};

Client.prototype.error = function(
  // End request with HTTP error code
  code, // HTTP status code
  err // instance of Error class (optional)
) {
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
      this.include(data, template, '', tpl => {
        this.end(tpl);
      });
    }
    impress.log.error(`HTTP ${code}\t${message}\t${this.url}`);
  });
};

Client.prototype.redirect = function(
  // Redirect to specified location
  location // URL
) {
  if (this.res.setHeader && !this.res.headersSent) {
    this.res.setHeader('Location', location);
    this.res.statusCode = 302;
  }
};

Client.prototype.inherited = function(
  // Inherit behavior from parent directory
  callback // after inherited handler executed
) {
  const application = this.application;

  if (this.execPath !== '/' && this.currentHandler !== 'meta') {
    this.execPath = api.common.dirname(this.execPath) + '/';
    this.execPathDir = application.dir + '/www' + this.execPath;
    this.fileHandler(this.currentHandler, true, callback);
  }
};

Client.prototype.fileHandler = function(
  handler, // handler file name: access, request, end, lazy, error
  // and HTTP methods: get, post, put, delete, patch, head, options
  inheritance, // boolean flag, true if called from Client.prototype.inherited
  callback // after fileHandler executed
) {
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
  api.fs.access(filePath, (err) => {
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
};

Client.prototype.detectRealPath = function(
  // Find nearest existent folder
  callback // after path detected
) {
  const application = this.application;

  let relPath = application.relative(this.realPathDir);
  const folderCache = application.cache.folders.get(relPath);

  const detected = (
    folderCache && folderCache !== impress.DIR_NOT_EXISTS ||
    this.realPath === '/'
  );
  if (detected) {
    callback();
    return;
  }

  api.fs.access(this.realPathDir, (err) => {
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
};

Client.prototype.calculateAccess = function() {
  this.access.allowed = (
    (
      (!this.logged && this.access.guests) ||
      (!!this.logged && this.access.logged)
    ) && (
      (this.schema === 'http' && this.access.http) ||
      (this.schema === 'https' && this.access.https)
    )
  );
  if (this.logged) this.access.allowed = this.access.allowed && (
    (!this.access.groups) ||
    (this.access.groups &&
      (
        this.access.groups.length === 0 ||
        this.access.groups.includes(this.user.group) ||
        this.access.groups.includes('local') && this.local
      )
    )
  );
};

Client.prototype.runScript = function(
  // Run script in client context
  handler, // handler name
  fileName, // file name
  callback // after handler executed
) {
  const application = this.application;

  application.createScript(fileName, (err, fn) => {
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
      api.timers.setImmediate(() => {
        this.executeFunction(fn);
      });
      callback();
    } else {
      this.executeFunction(fn, callback);
    }
  });
};

Client.prototype.executeFunction = function(
  // Execute function in client context
  fn, // function
  callback // after function executed
) {
  const application = this.application;
  callback = api.common.once(callback);

  if (fn && fn.meta) {
    const vd = api.definition.validate(
      this.parameters, fn.meta, 'parameters', true
    );
    if (!vd.valid) {
      this.context.data = fn.meta;
      this.res.statusCode = 400;
      fn = null;
    }
  }
  if (typeof fn !== 'function') {
    callback();
    return;
  }
  try {
    if (fn.length === 2) { // Execute Impress handlers
      fn(this, (result, errorCode, headers) => {
        if (result !== undefined) this.context.data = result;
        if (errorCode) this.res.statusCode = errorCode;
        if (headers && !this.res.headersSent) {
          if (typeof headers === 'string') {
            this.res.setHeader('Content-Type', headers);
          } else {
            let headerName;
            for (headerName in headers) {
              this.res.setHeader(headerName, headers[headerName]);
            }
          }
        }
        callback();
      });
    } else if (fn.length === 3) { // Execute middleware
      fn(this.req, this.res, () => {
        callback();
      });
    } else {
      callback();
    }
  } catch (err) {
    this.error(500, err);
    application.logException(err);
    callback();
  }
};

Client.prototype.static = function(
  // Send static file and close connection
  onNotServed // if not static
) {
  const isRoot = this.path === '/';
  let relPath = '/static';
  if (isRoot) relPath += '/index.html';
  else relPath += api.querystring.unescape(this.url);
  if (!this.staticCache(relPath, onNotServed)) {
    this.serveStatic(relPath, onNotServed);
  }
};

Client.prototype.staticCache = function(
  // Send static from cache
  relPath, // relative path is a cash index
  onNotServed // boolean: true - served, false - not served
) {
  const application = this.application;

  const cache = application.cache.static.get(relPath);
  const isNum = typeof cache === 'number';
  const cached = cache && !isNum;
  if (cached) this.buffer(cache);
  else if (isNum) onNotServed();
  return cached;
};

Client.prototype.serveStatic = function(
  // Serve static file
  relPath, // application relative path to file
  onNotServed // if not static
) {
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
    } else if (stats.size < application.config.files.cacheMaxFileSize) {
      this.compress(filePath, stats);
    } else {
      this.stream(filePath, stats);
    }
  };

  const serveGzip = (err, stats) => {
    if (err) api.fs.stat(filePath, serveFile);
    else this.staticFile(filePath + gz, relPath + gz, stats);
  };

  if (isCompressed) api.fs.stat(filePath, serveFile);
  else api.fs.stat(filePath + gz, serveGzip);
};

Client.prototype.staticFile = function(
  // Send compressed static file
  filePath, // absolute path to file
  relPath, // application relative path to file
  stats // file stats
) {
  const application = this.application;

  api.fs.readFile(filePath, (err, data) => {
    if (err) {
      this.error(404);
      return;
    }
    const cache = { stats, compressed: true, data };
    this.end(cache);
    application.cache.static.add(relPath, cache);
  });
};

Client.prototype.buffer = function(
  // Send static buffer and drop connection
  cache // { stats, compressed, data }
  // stats - instance of fs.Stats
  // compressed - boolean gzip compression flag
  // data - Buffer data to send
) {
  const time = this.req.headers['if-modified-since'];
  const notMod = time && api.common.isTimeEqual(time, cache.stats.mtime);
  if (notMod) this.error(304);
  else this.end(cache);
};

Client.prototype.compress = function(
  // Refresh static in memory cache with compression and minification
  filePath, // path to handler (from application base directory)
  stats // instance of fs.Stats
) {
  const application = this.application;

  const time = this.req.headers['if-modified-since'];
  const notMod = time && api.common.isTimeEqual(time, stats.mtime);
  if (notMod) {
    this.error(304);
    return;
  }

  application.compress(filePath, stats, (err, data, compressed) => {
    if (err) {
      this.error(404);
      return;
    }
    this.end({ stats, compressed, data });
  });
};

Client.prototype.signIn = function(
  login, // string
  password, // string
  callback // function(err, user)
) {
  const application = this.application;

  application.security.signIn(login, password, (err, user) => {
    if (!user) {
      callback(false);
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
    callback(true);
  });
};

Client.prototype.signOut = function(
  callback // function(isSuccess)
) {
  const application = this.application;

  if (!this.session) {
    callback(false);
    return;
  }

  const login = this.session.login;
  if (login) {
    const user = application.users.get(login);
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
  callback(true);
};

Client.prototype.signUp = function(
  login, // string
  password, // string
  callback // function(err, user)
) {
  const application = this.application;

  application.security.signUp(login, password, (err, user) => {
    if (user) {
      this.startSession();
      this.session.login = login;
      this.sessionModified = true;
      this.logged = true;
      application.users.set(login, user);
    }
    callback(null, !!user);
  });
};

Client.prototype.getUser = function(
  login, // string
  callback // function(err, user)
) {
  this.application.security.getUser(login, callback);
};

['index', 'files', 'templating'].forEach(name => {
  require('./client.' + name + '.js');
});
