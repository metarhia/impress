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
  const client = this;
  const socket = req.socket || req.connection.socket;
  const server = impress.config.servers[socket.server.serverName];
  const url = api.url.parse(req.url);

  req.connection.client = client;

  client.startTime = Date.now();
  client.req = req;
  client.res = res;
  client.socket = socket;
  client.server = server;
  client.dynamicHandler = false;
  client.application = application;
  client.query = api.querystring.parse(url.query);
  client.schema = server.transport === 'tls' ? 'https' : 'http';
  client.method = req.method.toLowerCase();
  client.access = Object.assign({}, DEFAULT_ACCESS);
  client.calculateAccess();
  client.parameters = req.parameters || {};
  Object.assign(client.parameters, client.query);
  client.slowTime = server.slowTime;
  client.timedOut = false;
  client.finished = false;
  client.url = url.pathname;
  client.host = api.common.parseHost(req.headers.host);
  client.path = api.common.addTrailingSlash(client.url);
  client.pathDir = application.dir + '/www' + client.path;
  client.realPath = client.path;
  client.realPathDir = client.pathDir;
  client.execPath = client.path;
  client.execPathDir = client.pathDir;
  client.ext = api.common.fileExt(client.path);
  client.typeExt = client.ext || 'html';
  client.data = ''; // data received from client
  client.chunks = []; // for large requests receiving in chunks
  client.ip = (
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    socket.remoteAddress
  );
  client.cookies = {}; // received cookies
  client.preparedCookies = []; // cookies to send

  if (res.setHeader) {
    const contentType = impress.MIME_TYPES[client.typeExt];
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public');
    res.setHeader('Keep-Alive', 'timeout=' + ~~(server.keepAlive / 1000));
  }
  if (client.ip) {
    client.ip = client.ip.replace(REGEXP_IPV4_TO_IPV6, '');
    client.ipInt = api.common.ipToInt(client.ip);
    application.emit('clientConnect', client);
    client.local = api.common.localIPs().includes(client.ip);
  }

  // Socket leak workaround
  res.on('finish', () => {
    application.emit('clientDisconnect', client);
    socket.removeAllListeners('timeout');
    socket.setTimeout(server.keepAlive, () => {
      socket.destroy();
    });
  });
};

impress.Client = Client;

const extCases = {

  html: (client) => {
    if (typeof(client.context.data) === 'string') {
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
  const client = this;
  const application = client.application;

  if (application) {
    client.endTime = Date.now();
    let location = '-';
    if (api.geoip) {
      const geo = api.geoip.lookup(client.ip);
      if (geo) location = geo.country + '/' + geo.region + '/' + geo.city;
    }
    const msg = (
      client.endTime - client.startTime + 'ms\t' +
      client.ip + '\t' +
      location + '\t' +
      ((client.user ? client.user.login : '-') || '-') + '\t' +
      (client.sid || '-') + '\t' +
      client.socket.bytesRead + '\t' +
      client.socket.bytesWritten + '\t' +
      client.req.method + '\t' +
      client.res.statusCode + '\t' +
      client.schema + '://' + client.req.headers.host + client.url + '\t' +
      client.req.headers['user-agent'] + '\t' +
      client.req.headers['referer']
    );
    application.log.access(msg);
    if (client.endTime - client.startTime >= client.slowTime) {
      application.log.slow(msg);
    }
  }
};

Client.prototype.fork = function(
  // Fork long worker
  workerFile // handler to be executed in forked process
) {
  const client = this;
  const application = client.application;
  const user = client.user;

  if (client.application) {
    const clientData = {
      url: client.url,
      query: client.query,
      sid: client.sid,
      session: client.session,
      context: client.context,
      fields: client.fields,
      parameters: client.parameters,
      user: null
    };
    if (user) clientData.user = {
      login: user.login,
      access: user.access,
      data: user.data
    };
    const fileName = client.pathDir + workerFile + '.js';
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
  const client = this;

  const cookies = client.req.headers.cookie;
  let parts, key;
  if (cookies) {
    cookies.split(';').forEach((cookie) => {
      parts = cookie.split('=');
      key = parts[0].trim();
      client.cookies[key] = (parts[1] || '').trim();
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
  const client = this;
  const application = client.application;

  const target = { hostname, port, path, method: client.req.method };
  const req = api.http.request(target, (response) => {
    client.res.writeHead(response.statusCode, response.headers);
    response.on('data', chunk => {
      client.res.write(chunk);
    });
    response.on('end', () => {
      client.end();
    });
  });
  req.on('error', (err) => {
    if (application) {
      application.log.error('Error proxying request: ' + err.message);
    }
  });
  req.end();
  impress.stat.res++;
};

Client.prototype.dispatch = function() {
  const client = this;

  client.dynamicHandler = true;
  client.parseCookies();
  const code = impress.firewall.check(client);
  if (code === impress.firewall.ACCESS_ALLOWED) {
    client.restoreSession(() => {
      client.detectRealPath(() => {
        client.processing();
      });
    });
  } else if (code === impress.firewall.ACCESS_DENIED) {
    client.error(403);
  } else if (code === impress.firewall.ACCESS_LIMITED) {
    client.error(429);
  } else {
    client.error(400);
  }
};

Client.prototype.block = function(
  msec // Add current client to deny list by IP and SID (if session exists)
) {
  const client = this;

  client.error(403);
  msec = api.common.duration(msec) || 0;
  impress.firewall.ip.deny(client.ipInt, msec);
  if (client.sid) impress.firewall.sid.deny(client.sid, msec);
};

Client.prototype.startSession = function() {
  const client = this;
  const application = client.application;

  if (application && !client.session) {
    client.sid = api.common.generateSID(application.config.sessions);
    client.user = null;
    client.session = application.security.session({ sid: client.sid });
    client.sessionModified = true;
    client.sessionCreated = true;
    client.setCookie(
      application.config.sessions.cookie,
      client.sid,
      application.config.sessions.domain
    );
    if (impress.config.scale.cookie) {
      client.setCookie(impress.config.scale.cookie, impress.nodeId);
    }
    application.sessions.set(client.sid, client.session);
  }
};

Client.prototype.destroySession = function() {
  const client = this;
  const application = client.application;

  if (application && client.session) {
    client.deleteCookie(
      application.config.sessions.cookie,
      application.config.sessions.domain
    );
    client.deleteCookie(
      impress.config.scale.cookie,
      application.config.sessions.domain
    );
    const login = client.session.login;
    if (login) {
      const user = application.users.get(login);
      if (user) delete user.sessions[client.sid];
    }
    application.sessions.delete(client.sid);
    application.security.deleteSession(client.sid);
    client.sid = null;
    client.user = null;
    client.session = null;
  }
};

Client.prototype.restoreSession = function(
  callback // function(err, session) call after session restored
) {
  const client = this;
  const application = client.application;

  const sid = client.cookies[application.config.sessions.cookie];

  if (!application || !sid) {
    callback();
    return;
  }

  const session = application.sessions.get(sid);
  if (session) {
    client.setSession(sid, session);
    callback();
    return;
  }
  const valid = api.common.validateSID(application.config.sessions, sid);
  if (!valid) {
    client.deleteCookie(application.config.sessions.cookie);
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
      client.deleteCookie(application.config.sessions.cookie);
      callback(new Error('Session not found'));
      return;
    }
    client.setSession(sid, session);
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
  const client = this;
  const application = client.application;

  client.sid = sid;
  client.session = session;
  client.logged = !!client.session.login;
  client.user = application.security.getSessionUser(sid);
  application.emit('clientSession', client);
};

Client.prototype.saveSession = function(callback) {
  const client = this;
  const application = client.application;

  if (!application) {
    callback();
    return;
  }
  const cfg = application.config.sessions;
  if (cfg && cfg.persist && client.session) {
    if (client.sessionCreated) {
      application.security.createSession(client.session, done);
      return;
    }
    if (client.sessionModified) {
      application.security.updateSession(client.session, done);
      return;
    }
  }
  callback();

  function done() {
    client.sessionCreated = false;
    client.sessionModified = false;
    callback();
  }
};

Client.prototype.processing = function() {
  const client = this;
  const application = client.application;

  const cache = application.cache.pages[client.realPath];
  if (cache && client.startTime < cache.expireTime) {
    client.sendCache(cache);
    return;
  }

  if (!client.ext) {
    client.ext = api.common.fileExt(client.realPath);
    client.typeExt = client.ext || 'html';
  }

  const handlers = ['access', 'request', client.method, 'end', 'lazy'];
  client.context = {};

  if (client.typeExt === 'sse') {
    client.eventChannel = null;
  } else if (client.res.setHeader && !client.res.headersSent) {
    client.defaultContentType();
  }

  if (client.ext === 'ws' && application.websocket) {
    application.websocket.initialize(client);
  }

  // Execute handlers
  api.metasync.series(handlers, (handler, cb) => {
    if (
      handler === 'access' ||
      client.access.virtual ||
      client.path === client.realPath
    ) {
      client.execPath = client.realPath;
      client.execPathDir = client.realPathDir;
      client.fileHandler(handler, false, cb);
    } else {
      client.error(404);
      cb(new Error(404));
    }
  }, (err) => {
    if (!err && !client.res.headersSent) {
      if (!client.access.allowed) {
        client.error(403);
        return;
      }
      if (client.access.auth && !client.local) {
        client.basicAuth();
        return;
      }
      if (client.ext === '' && client.access.intro) {
        client.introspect();
      } else {
        const extCase = extCases[client.typeExt] || extCases.html;
        if (extCase) extCase(client);
        else client.error(404);
      }
    }
  });
};

Client.prototype.basicAuth = function() {
  const client = this;

  let authBase64 = client.req.headers.authorization;
  let authAllowed = false;
  if (authBase64) {
    authBase64 = authBase64.substring(6);
    const auth = Buffer.from(authBase64, 'base64');
    authAllowed = client.access.auth === auth.toString();
  }
  if (!authAllowed) {
    const realm = client.access.realm || 'Restricted';
    client.res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
    client.error(401);
  }
};

Client.prototype.defaultContentType = function() {
  const client = this;
  const application = client.application;

  const contentType = impress.MIME_TYPES[client.typeExt];
  if (contentType) {
    client.res.setHeader('Content-Type', contentType);
  }
  const allowOrigin = api.common.getByPath(
    application.config,
    'application.allowOrigin'
  );
  if (allowOrigin) {
    client.res.setHeader(
      'Access-Control-Allow-Origin', allowOrigin
    );
    client.res.setHeader(
      'Access-Control-Allow-Headers', 'origin, content-type, accept'
    );
  }
};

Client.prototype.processingPage = function() {
  const client = this;

  const data = client.context.data || {};
  client.execPath = client.realPath;
  client.execPathDir = client.realPathDir;
  client.template(data, 'html', '', tpl => {
    client.end(tpl);
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
  const client = this;

  const isString = typeof(output) === 'string';
  const isBuffer = output instanceof Buffer;
  const isUndef = output === undefined;
  const cache = (isString || isBuffer || isUndef) ? { data: output } : output;
  const length = (cache && cache.data) ? cache.data.length : 0;

  client.finished = true;
  client.saveSession(() => {
    client.sendCookie();
    if (!client.res.headersSent) {
      if (cache.stats) {
        client.res.setHeader('Content-Length', cache.stats.size);
        client.res.setHeader('Last-Modified', cache.stats.mtime.toGMTString());
      }
      if (cache.compressed) client.res.setHeader('Content-Encoding', 'gzip');
    }
    if (isString && length > impress.COMPRESS_ABOVE) {
      api.zlib.gzip(cache.data, (err, data) => {
        if (err) {
          client.error(500, err);
          return;
        }
        if (client.res.headersSent || !client.res.setHeader) {
          client.res.end();
        } else {
          client.res.setHeader('Content-Encoding', 'gzip');
          client.res.setHeader('Content-Length', data.length);
          client.res.end(data);
          if (client.context && client.context.cache) client.saveCache(data);
        }
      });
    } else {
      client.res.end(cache.data);
      if (client.context && client.context.cache) client.saveCache(cache.data);
    }
    client.accessLog();
    impress.stat.res++;
  });
};

Client.prototype.saveCache = function(
  data // reply (string)
) {
  const client = this;
  const application = client.application;

  const now = new Date();
  const mtime = now.getTime();
  const time = now.toGMTString();

  application.cache.pages[client.realPath] = {
    expireTime: client.startTime + client.context.cache,
    statusCode: client.res.statusCode,
    contentType: client.res.getHeader('content-type'),
    contentEncoding: client.res.getHeader('content-encoding'),
    stats: { size: data.length, mtime, time },
    data
  };
};

Client.prototype.sendCache = function(
  cache // structure { stats, compressed, data }
) {
  const client = this;

  client.res.statusCode = cache.statusCode;
  if (cache.contentType) {
    client.res.setHeader('Content-Type', cache.contentType);
  }
  if (cache.contentEncoding) {
    client.res.setHeader('Content-Encoding', cache.contentEncoding);
  }
  if (cache.stats) {
    client.res.setHeader('Content-Length', cache.stats.size);
    client.res.setHeader('Last-Modified', cache.stats.time);
  }
  client.end(cache.data);
};

Client.prototype.error = function(
  // End request with HTTP error code
  code, // HTTP status code
  err // instance of Error class (optional)
) {
  const client = this;
  const application = client.application;

  if (err) client.err = err;
  client.res.statusCode = code;
  client.fileHandler('error', false, () => {
    if (code === 304) {
      client.end();
      return;
    }
    const message = api.http.STATUS_CODES[code] || 'Unknown error';
    if (client.typeExt === 'json') {
      client.end(`{"statusCode":${code}}`);
    } else {
      if (client.res.headersSent === false) {
        client.res.setHeader('Content-Type', impress.MIME_TYPES.html);
      }
      const data = { title: 'Error ' + code, message };
      const template = application.systemTemplates.error || '';
      client.include(data, template, '', tpl => {
        client.end(tpl);
      });
    }
    application.log.error(`HTTP ${code}\t${message}\t${client.url}`);
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
  const client = this;
  const application = client.application;

  if (client.execPath !== '/' && client.currentHandler !== 'meta') {
    client.execPath = api.common.dirname(client.execPath) + '/';
    client.execPathDir = application.dir + '/www' + client.execPath;
    client.fileHandler(client.currentHandler, true, callback);
  }
};

Client.prototype.fileHandler = function(
  handler, // handler file name: access, request, end, lazy, error
  // and HTTP methods: get, post, put, delete, patch, head, options
  inheritance, // boolean flag, true if called from Client.prototype.inherited
  callback // after fileHandler executed
) {
  const client = this;
  const application = client.application;

  const fileName = handler + '.js';
  const filePath = client.execPathDir + fileName;
  const relPath = application.relative(filePath);
  const fileCache = application.cache.files.get(relPath);

  if (!inheritance) {
    client.currentHandler = handler;
  }
  if (fileCache) {
    if (fileCache !== impress.FILE_EXISTS) callback();
    else client.runScript(handler, filePath, callback);
    return;
  }
  api.fs.access(filePath, (err) => {
    if (!err) {
      client.runScript(handler, filePath, callback);
      if (!inheritance) {
        application.cache.files.set(relPath, impress.FILE_EXISTS);
      }
      application.cache.watch(api.path.dirname(relPath));
    } else if (client.execPath !== '/' && handler !== 'meta') {
      // Try to process request on parent directory
      client.execPath = api.common.dirname(client.execPath);
      client.execPathDir = application.dir + '/www' + client.execPath;
      client.fileHandler(handler, inheritance, callback);
      application.cache.watch('/www' + client.execPath);
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
  const client = this;
  const application = client.application;

  let relPath = application.relative(client.realPathDir);
  const folderCache = application.cache.folders.get(relPath);

  const detected = (
    folderCache && folderCache !== impress.DIR_NOT_EXISTS ||
    client.realPath === '/'
  );
  if (detected) {
    callback();
    return;
  }

  api.fs.access(client.realPathDir, (err) => {
    if (err) {
      application.cache.folders.set(relPath, impress.DIR_NOT_EXISTS);
      client.realPath = api.common.dirname(client.realPath);
      client.realPathDir = application.dir + '/www' + client.realPath;
      relPath = application.relative(client.realPathDir);
      client.detectRealPath(callback);
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
  const client = this;
  const application = client.application;

  application.createScript(fileName, (err, fn) => {
    if (err) {
      client.err = err;
      callback();
      return;
    }
    if (handler === 'access') {
      // fn is an object here, not function
      Object.assign(client.access, fn);
      client.calculateAccess();
      callback();
      return;
    }
    if (!client.access.allowed || !client.application) {
      callback();
      return;
    }
    // save link to client { req, res }
    if (handler === 'lazy') {
      api.timers.setImmediate(() => {
        client.executeFunction(fn);
      });
      callback();
    } else {
      client.executeFunction(fn, callback);
    }
  });
};

Client.prototype.executeFunction = function(
  // Execute function in client context
  fn, // function
  callback // after function executed
) {
  const client = this;
  const application = client.application;
  callback = api.common.once(callback);

  if (fn && fn.meta) {
    const vd = api.definition.validate(
      client.parameters, fn.meta, 'parameters', true
    );
    if (!vd.valid) {
      client.context.data = fn.meta;
      client.res.statusCode = 400;
      fn = null;
    }
  }
  if (typeof(fn) !== 'function') {
    callback();
    return;
  }
  try {
    if (fn.length === 2) { // Execute Impress handlers
      fn(client, (result, errorCode, headers) => {
        if (result !== undefined) client.context.data = result;
        if (errorCode) client.res.statusCode = errorCode;
        if (headers && !client.res.headersSent) {
          if (typeof(headers) === 'string') {
            client.res.setHeader('Content-Type', headers);
          } else {
            let headerName;
            for (headerName in headers) {
              client.res.setHeader(headerName, headers[headerName]);
            }
          }
        }
        callback();
      });
    } else if (fn.length === 3) { // Execute middleware
      fn(client.req, client.res, () => {
        callback();
      });
    } else {
      callback();
    }
  } catch (err) {
    client.error(500, err);
    application.logException(err);
    callback();
  }
};

Client.prototype.static = function(
  // Send static file and close connection
  onNotServed // if not static
) {
  const client = this;

  const basePath = '/static';
  let relPath = '/static/index.html';
  if (client.path !== '/') {
    const url = api.querystring.unescape(client.url);
    const safePath = api.path.resolve(basePath, url);
    if (safePath.startsWith(basePath)) relPath = safePath;
  }
  if (!client.staticCache(relPath, onNotServed)) {
    client.serveStatic(relPath, onNotServed);
  }
};

Client.prototype.staticCache = function(
  // Send static from cache
  relPath, // relative path is a cash index
  onNotServed // boolean: true - served, false - not served
) {
  const client = this;
  const application = client.application;

  const cache = application.cache.static.get(relPath);
  const isNum = typeof(cache) === 'number';
  const cached = cache && !isNum;
  if (cached) client.buffer(cache);
  else if (isNum) onNotServed();
  return cached;
};

Client.prototype.serveStatic = function(
  // Serve static file
  relPath, // application relative path to file
  onNotServed // if not static
) {
  const client = this;
  const application = client.application;

  const gz = '.gz';
  const filePath = application.dir + relPath;
  const isCompressed = impress.COMPRESSED_EXT.includes(client.ext);

  if (isCompressed) api.fs.stat(filePath, serveFile);
  else api.fs.stat(filePath + gz, serveGzip);

  function serveGzip(err, stats) {
    if (err) api.fs.stat(filePath, serveFile);
    else client.staticFile(filePath + gz, relPath + gz, stats);
  }

  function serveFile(err, stats) {
    if (err) {
      application.cache.watch(api.path.dirname(relPath));
      onNotServed();
    } else if (stats.isDirectory()) {
      if (!client.staticCache(relPath, onNotServed)) {
        client.index(filePath);
      }
    } else if (stats.size < application.config.files.cacheMaxFileSize) {
      client.compress(filePath, stats);
    } else {
      client.stream(filePath, stats);
    }
  }

};

Client.prototype.staticFile = function(
  // Send compressed static file
  filePath, // absolute path to file
  relPath, // application relative path to file
  stats // file stats
) {
  const client = this;
  const application = client.application;

  api.fs.readFile(filePath, (err, data) => {
    if (err) {
      client.error(404);
      return;
    }
    const cache = { stats, compressed: true, data };
    client.end(cache);
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
  const client = this;

  const time = client.req.headers['if-modified-since'];
  const notMod = time && api.common.isTimeEqual(time, cache.stats.mtime);
  if (notMod) client.error(304);
  else client.end(cache);
};

Client.prototype.compress = function(
  // Refresh static in memory cache with compression and minification
  filePath, // path to handler (from application base directory)
  stats // instance of fs.Stats
) {
  const client = this;
  const application = client.application;

  const time = client.req.headers['if-modified-since'];
  const notMod = time && api.common.isTimeEqual(time, stats.mtime);
  if (notMod) {
    client.error(304);
    return;
  }

  application.compress(filePath, stats, (err, data, compressed) => {
    if (err) {
      client.error(404);
      return;
    }
    client.end({ stats, compressed, data });
  });
};

Client.prototype.signIn = function(
  login, // string
  password, // string
  callback // function(err, user)
) {
  const client = this;
  const application = client.application;

  application.security.signIn(login, password, (err, user) => {
    if (!user) {
      callback(false);
      return;
    }
    client.startSession();
    if (!client.application.users.has(user.login)) {
      client.application.users.set(user.login, user);
    }
    client.session.login = user.login;
    if (user.group) client.session.group = user.group;
    client.sessionModified = true;
    client.logged = true;
    callback(true);
  });
};

Client.prototype.signOut = function(
  callback // function(isSuccess)
) {
  const client = this;
  const application = client.application;

  if (!client.session) {
    callback(false);
    return;
  }

  const login = client.session.login;
  if (login) {
    const user = application.users.get(login);
    if (user && user.sessions) {
      delete user.sessions[client.sid];
    }
  }
  if (client.session.login) {
    client.session.login = null;
  }
  if (client.session.group) {
    client.session.group = null;
  }
  client.sessionModified = true;
  client.logged = false;
  client.user = null;
  callback(true);
};

Client.prototype.signUp = function(
  login, // string
  password, // string
  callback // function(err, user)
) {
  const client = this;
  const application = client.application;

  application.security.signUp(login, password, (err, user) => {
    if (user) {
      client.startSession();
      client.session.login = login;
      client.sessionModified = true;
      client.logged = true;
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
