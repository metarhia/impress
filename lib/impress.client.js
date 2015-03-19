'use strict';

// Client class
//
var Client = function(application, req, res) {
  var server = req.connection.server ? req.connection.server : req.connection.pair.server,
      url = api.url.parse(req.url);

  req.client = this;
  res.client = this;

  req.connection.client = this;

  this.req = req;
  this.res = res;
  this.dynamicHandler = false;
  this.application = application;
  this.startTime = new Date().getTime();
  this.access = api.impress.clone(impress.DEFAULT_ACCESS);
  this.calculateAccess();
  this.query = api.querystring.parse(url.query);
  this.parameters = {};
  api.impress.extend(this.parameters, this.query);

  this.schema = (!req.connection.server) ? 'https' : 'http';
  this.method = req.method.toLowerCase();
  this.slowTime = server.slowTime;
  this.url = url.pathname;
  this.host = api.impress.parseHost(req.headers.host);
  this.path = api.impress.addTrailingSlash(this.url);
  this.pathDir = application.dir + '/app' + this.path;
  this.realPath = this.path;
  this.realPathDir = this.pathDir;
  this.execPath = this.path;
  this.execPathDir = this.pathDir;
  this.ext = api.impress.fileExt(this.path);
  this.typeExt = this.ext || 'html';
  this.data =''; // data received from client
  this.chunks = []; // for large requests receiving in chunks
  this.ip = (
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  );
  this.local = api.impress.inArray(api.impress.localIPs, this.ip);

  this.cookies = {}; // received cookies
  this.preparedCookies = []; // cookies to send

  if (res.setHeader) {
    res.setHeader('Content-Type', impress.MIME_TYPES[this.typeExt]);
    res.setHeader('Cache-Control', 'public');
  }
};

impress.Client = Client;
impress.Client.prototype.application = impress;

// Access log client request
//
Client.prototype.accessLog = function() {
  var client = this,
      application = client.application;

  if (application && application.log) {
    client.endTime = new Date().getTime();
    var location = '-';
    if (api.geoip) {
      var geo = api.geoip.lookup(client.ip);
      if (geo) location = geo.country + '/' + geo.region + '/' + geo.city;
    }
    var processingTime = client.endTime - client.startTime,
        msg = (
          processingTime + 'ms\t' +
          client.ip + '\t' +
          location + '\t' +
          ((client.user ? client.user.login : '-') || '-') + '\t' +
          (client.sid || '-') + '\t' +
          client.req.socket.bytesRead + '\t' +
          client.req.socket.bytesWritten + '\t' +
          client.req.method + '\t' +
          client.res.statusCode + '\t' +
          client.schema + '://' + client.req.headers.host + client.url + '\t' +
          client.req.headers['user-agent'] + '\t' +
          client.req.headers['referer']
        );
    application.log.access(msg);
    if (client.endTime - client.startTime >= client.slowTime) application.log.slow(msg);
  }
};

// Fork long worker
//
Client.prototype.fork = function(workerFile) {
  var client = this,
      application = client.application,
      user = client.user;

  if (client.application) {
    var clientData = {
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
    var fileName = client.pathDir + workerFile + '.js';
    impress.forkLongWorker(application.name, fileName, api.stringify(clientData));
  }
};

// Kill long worker
//
Client.prototype.killLongWorker = function(workerFile) {
  var fileName = this.pathDir + workerFile + '.js';
  if (this.application) impress.killLongWorker(this.application.name, fileName);
};

// Start session
//
Client.prototype.startSession = function() {
  var client = this,
      application = client.application;

  if (application && !client.session) {
    client.sid = api.impress.generateSID(application.config);
    client.user = new application.User();
    client.session = new application.Session({ sid: client.sid });
    client.sessionModified = true;
    client.sessionCreated = true;
    client.setCookie(application.config.sessions.cookie, client.sid, application.config.sessions.domain);
    if (impress.config.scale.cookie) client.setCookie(impress.config.scale.cookie, impress.nodeId);
    application.sessions[client.sid] = client.session;
  }
};

// Destroy session
//
Client.prototype.destroySession = function() {
  var client = this,
      application = client.application;

  if (application && client.session) {
    client.deleteCookie(application.config.sessions.cookie, application.config.sessions.domain);
    client.deleteCookie(impress.config.scale.cookie, application.config.sessions.domain);
    // clear other structures
    var login = client.session.login;
    if (login && application.users[login]) delete application.users[login].sessions[client.sid];
    delete application.sessions[client.sid];
    // TODO: delete session from DB persistent session storage
    application.security.deletePersistentSession(client.sid, api.impress.emptyness);
    client.sid = null;
    client.user = null;
    client.session = null;
  }
};

// Set cookie name=value, host is optional
//
Client.prototype.setCookie = function(name, value, host, httpOnly) {
  var expires = new Date(2100, 1, 1).toUTCString();
  host = host || this.req.headers.host;
  var pos = host.indexOf(':');
  if (pos > -1) host = host.substring(0, pos);
  if (typeof(httpOnly) === 'undefined') httpOnly = true;
  this.preparedCookies.push(name + '=' + value + '; expires=' + expires + '; Path=/; Domain=' + host + (httpOnly ? '; HttpOnly' : ''));
};

// Delete cookie by name
//
Client.prototype.deleteCookie = function(name, host) {
  var aHost = host || this.req.headers.host;
  if (!api.impress.isIp(aHost)) aHost = '.' + aHost;
  this.preparedCookies.push(name + '=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain=' + aHost);
};

// Send cookies prepared in client.cookies
//
Client.prototype.sendCookie = function() {
  if (this.preparedCookies && this.preparedCookies.length && !this.res.headersSent) this.res.setHeader('Set-Cookie', this.preparedCookies);
};

// Route request to external HTTP server
//
Client.prototype.proxy = function(host, port, url) {
  var client = this,
      application = client.application;

  var req = api.http.request({
    hostname: host,
    port: port,
    path: url,
    method: client.req.method
  }, function(response) {
    client.res.writeHead(response.statusCode, response.headers);
    response.on('data', function(chunk) {
      client.res.write(chunk);
    });
    response.on('end', function() { client.end(); });
  });
  req.on('error', function(e) {
    if (application && application.log) application.log.error(
      'Error proxying request: ' + e.message
    );
  });
  req.end();
  impress.stat.responseCount++;
};

// Dispatch dynamic request
//
Client.prototype.dispatch = function() {
  var client = this;
  
  client.dynamicHandler = true;
  client.restoreSession(function() {
    client.processing();
  });
};

// Restore session if available
//
Client.prototype.restoreSession = function(callback) {
  var client = this,
      application = client.application;

  if (application) {
    // Parse cookies
    if (client.req.headers.cookie) client.req.headers.cookie.split(';').forEach(function(cookie) {
      var parts = cookie.split('=');
      client.cookies[api.impress.trim(parts[0])] = api.impress.trim(parts[1] || '');
    });
    // Detect session, restore session or delete cookie
    var sid = client.cookies[application.config.sessions.cookie];
    if (sid) {
      if (api.impress.validateSID(application.config, sid)) {
        if (application.sessions[sid]) {
          client.sid = sid;
          client.session = application.sessions[sid];
          client.logged = !!client.session.login;
          client.user = application.security.getSessionUser(sid);
          callback();
        } else {
          if (application.config.sessions.persist) {
            application.security.restorePersistentSession(client, sid, function(err, session) {
              if (session) {
                client.sid = sid;
                client.session = session;
                client.user = application.security.getSessionUser(sid);
                client.logged = !!client.session.login;
              } else client.deleteCookie(application.config.sessions.cookie);
              callback();
            });
          } else callback();
        }
      } else {
        client.deleteCookie(application.config.sessions.cookie);
        callback();
      }
    } else callback();
  }
};

// Save session
//
Client.prototype.saveSession = function(callback) {
  var client = this,
      application = client.application;

  if (application && application.config.sessions && application.config.sessions.persist &&
    client.session && (client.sessionCreated || client.sessionModified)
  ) application.security.savePersistentSession(client, client.sid, callback);
  else callback();
};

// Process request
//
Client.prototype.processing = function() {
  var client = this,
      application = client.application;

  client.detectRealPath(function() {
    var cache = application.cache.pages[client.realPath];
    if (cache && (client.startTime < cache.expireTime)) {
      client.res.statusCode = cache.statusCode;
      client.res.setHeader('Content-Type', cache.contentType);
      if (cache.contentEncoding) client.res.setHeader('Content-Encoding', cache.contentEncoding);
      if (cache.stats) {
        client.res.setHeader('Content-Length', cache.stats.size);
        client.res.setHeader('Last-Modified',  cache.stats.mtime.toGMTString());
      }
      client.end(cache.data);
    } else {
      client.ext = api.impress.fileExt(client.realPath);
      client.typeExt = client.ext || 'html';
      var handlers = [ 'access', 'request', client.method, 'end', 'lazy' ];
      client.context = {};

      // Set Content-Type if detected and not SSE
      if (client.typeExt === 'sse') client.eventChannel = null;
      else if (client.typeExt !== 'ws' && !client.res.headersSent) {
        var contentType = impress.MIME_TYPES[client.typeExt];
        if (contentType) client.res.setHeader('Content-Type', contentType);
        var allowOrigin = api.impress.getByPath(application.config, 'application.allowOrigin');
        if (allowOrigin) {
          client.res.setHeader('Access-Control-Allow-Origin', allowOrigin);
          client.res.setHeader('Access-Control-Allow-Headers', 'origin, content-type, accept');
        }
      }

      // Initialize long connections: SSE, WebSocket, Impress RPC
      if (client.ext === 'ws' && application.websocket) application.websocket.initialize(client);
      if (client.ext === 'rpc' && application.rpc) application.rpc.initialize(client);

      // Execute handlers
      api.async.eachSeries(handlers, function(handler, callback) {
        if (handler === 'access' || client.access.virtual || client.path === client.realPath ) {
          client.execPath = client.realPath;
          client.execPathDir = client.realPathDir;
          client.fileHandler(handler, false, callback);
        } else {
          client.error(404);
          callback(new Error(404));
        }
      }, function(err) {
        if (!err && !client.res.headersSent) {
          if (client.access.allowed) {
            if (client.access.auth && !client.local) {
              var authBase64 = client.req.headers['authorization'],
                  authAllowed = false;
              if (authBase64) {
                authBase64 = authBase64.substring(6);
                var auth = new Buffer(authBase64, 'base64');
                authAllowed = client.access.auth === auth.toString();
              }
              if (!authAllowed) {
                var realm = client.access.realm || 'Restricted';
                client.res.setHeader('WWW-Authenticate', 'Basic realm="' + realm + '"');
                client.error(401);
                return;
              }
            }
            if (client.ext === '' && client.access.intro) {
              client.introspect();
            } else if (client.typeExt === 'html' || client.typeExt === 'ajax') {
              if (typeof(client.context.data) === 'string') client.end(client.context.data);
              else client.processingPage();
            } else if (client.typeExt === 'sse') {
              if (application.sse) client.sseConnect();
              else client.error(510);
            } else if (client.typeExt === 'ws') {
              if (application.websocket) application.websocket.finalize(client);
              else client.error(510);
            } else if (client.typeExt === 'rpc') {
              if (application.rpc) application.rpc.finalize(client);
              else {
                if (application.websocket) {
                  application.websocket.initialize(client);
                  application.websocket.finalize(client);
                } else client.error(510);
              }
            } else if (client.typeExt === 'json') {
              if (client.context.data) client.end(api.stringify(client.context.data));
              else client.error(400);
            } else if (client.typeExt === 'jsonp') {
              if (client.context.data) {
                var jsonpCallbackName =  client.query['callback'] || client.query['jsonp'] || 'callback';
                client.end(jsonpCallbackName + '(' + api.stringify(client.context.data) + ');');
              } else client.error(400);
            } else if (client.typeExt === 'csv') {
              if (client.context.data) {
                api.csv.stringify(client.context.data, function(err, data) {
                  client.end(data);
                });
              } else client.error(400);
            } else client.error(404);
          } else client.error(403);
        }
      });
    }
  });
};

// Process dynamic and static pages, cms pages
//
Client.prototype.processingPage = function() {
  var client = this;

  var data = this.context.data || {};
  client.execPath = client.realPath;
  client.execPathDir = client.realPathDir;
  client.template(data, 'html', '', function(tpl) {
    client.end(tpl);
  });
};

// Cache URL response
//
Client.prototype.cache = function(timeout) {
  this.context.cache = api.impress.duration(timeout);
};

// End request
//
Client.prototype.end = function(output, socket) {
  var client = this,
      application = client.application;

  var isBuffer = output instanceof Buffer,
      length = output ? output.length : 0;
  client.saveSession(function() {
    client.sendCookie();
    if (!client.res.headersSent) {
      if (client.stats) {
        client.res.setHeader('Content-Length', client.stats.size);
        client.res.setHeader('Last-Modified', client.stats.mtime.toGMTString());
      }
      if (client.compressed) client.res.setHeader('Content-Encoding', 'gzip');
    }
    if (!isBuffer && !client.res.headersSent && length > impress.COMPRESS_ABOVE) {
      api.zlib.gzip(output, function(err, data) {
        if (err) client.error(500, err);
        else {
          client.res.setHeader('Content-Encoding', 'gzip');
          client.res.setHeader('Content-Length', data.length);
          client.res.end(data);
        }
      });
    } else client.res.end(output);

    client.accessLog();
    if (socket && socket._handle) socket.destroy();
    impress.stat.responseCount++;

    // Save in cache
    if (client.context && client.context.cache) {
      application.cache.pages[client.realPath] = {
        expireTime: client.startTime + client.context.cache,
        statusCode: client.res.statusCode,
        contentType: client.res.getHeader('content-type'),
        contentEncoding: client.res.getHeader('content-encoding'),
        stats: { size: output.length, mtime: new Date() },
        data: output
      };
    }
  });
};

// End request with HTTP error code
//   code - HTTP status code
//   socket or error - second parameter is instance of Socket or Error class
//
Client.prototype.error = function(code, es) {
  var client = this,
      application = client.application;

  var socket = null;
  if (es) {
    if (es._handle) socket = es;
    else client.err = es;
  }
  client.res.statusCode = code;
  client.fileHandler('error', false, function() {
    if (code === 304) client.end(); else {
      if (client.typeExt === 'json') client.end('{"statusCode":' + code + '}');
      else {
        if (client.res.headersSent === false) client.res.setHeader('Content-Type', impress.MIME_TYPES['html']);
        var message = impress.STATUS_CODES[code] || 'Unknown error';
        client.include(
          { title: 'Error ' + code, message: message },
          application.systemTemplates['error'] || '', '',
          function(tpl) {
            client.end(tpl, socket);
          }
        );
      }
    }
  });
};

// Redirect to specified location
//
Client.prototype.redirect = function(location) {
  if (!this.res.headersSent) {
    this.res.setHeader('Location', location);
    this.res.statusCode = 302;
  }
};

// Inherit behavior from parent folder
//
Client.prototype.inherited = function(callback) {
  var client = this,
      application = client.application;

  if (client.execPath !== '/' && client.currentHandler !== 'meta') {
    client.execPath = api.impress.dirname(client.execPath) + '/';
    client.execPathDir = application.dir + '/app' + client.execPath;
    client.fileHandler(client.currentHandler, true, callback);
  }
};

// Find existent file to execute
//
Client.prototype.fileHandler = function(handler, inheritance, callback) {
  var client = this,
      application = client.application;

  var fileName = handler + '.js',
      filePath = client.execPathDir + fileName,
      relPath = application.relative(filePath),
      fileCache = application.cache.files[relPath];

  if (!inheritance) client.currentHandler = handler;
  if (fileCache) {
    if (fileCache === impress.FILE_EXISTS) client.runScript(handler, filePath, callback);
    else callback();
  } else api.fs.exists(filePath, function(exists) {
    if (exists) {
      client.runScript(handler, filePath, callback);
      if (!inheritance) application.cache.files[relPath] = impress.FILE_EXISTS;
      application.watchCache(api.path.dirname(relPath));
    } else {
      // Try to process request on parent directory
      if (client.execPath !== '/' && handler !== 'meta') {
        client.execPath = api.impress.dirname(client.execPath);
        client.execPathDir = application.dir + '/app' + client.execPath;
        client.fileHandler(handler, inheritance, callback);
        application.watchCache('/app' + client.execPathDir);
      } else {
        // Lose hope to execute request and drop connection
        if (!inheritance) application.cache.files[relPath] = impress.FILE_NOT_FOUND;
        application.watchCache(api.path.dirname(relPath));
        callback();
      }
    }
  });
};

// Find nearest existent folder
//
Client.prototype.detectRealPath = function(callback) {
  var client = this,
      application = client.application;

  var relPath = application.relative(client.realPathDir),
      folderCache = application.cache.folders[relPath];
  if ((folderCache && folderCache !== impress.DIR_NOT_EXISTS) || client.realPath === '/') callback();
  else api.fs.exists(client.realPathDir, function(exists) {
    if (exists) {
      application.cache.folders[relPath] = impress.DIR_EXISTS;
      callback();
    } else {
      application.cache.folders[relPath] = impress.DIR_NOT_EXISTS;
      client.realPath = api.impress.dirname(client.realPath);
      client.realPathDir = application.dir + '/app' + client.realPath;
      relPath = application.relative(client.realPathDir);
      client.detectRealPath(callback);
    }
    application.watchCache(api.impress.stripTrailingSlash(relPath));
  });
};

// Calculate access
//
Client.prototype.calculateAccess = function() {
  this.access.allowed = (
    (
      (!this.logged && this.access.guests) ||
      (!!this.logged && this.access.logged)
    ) && (
      (!!this.req.connection.server && this.access.http) ||
      (!this.req.connection.server && this.access.https)
    )
  );
  if (this.logged) this.access.allowed = this.access.allowed && (
    (!this.access.groups) ||
    (this.access.groups &&
      (
        this.access.groups.length === 0 ||
        api.impress.inArray(this.access.groups, this.user.group) ||
        api.impress.inArray(this.access.groups, 'local') && this.local
      )
    )
  );
};

// Run script in client context
//
Client.prototype.runScript = function(handler, fileName, callback) {
  var client = this,
      application = client.application;

  application.createScript(fileName, function(err, fn) {
    if (err) {
      client.err = err;
      application.logException(err);
      callback();
    } else if (handler === 'access') {
      client.access = api.impress.extend(client.access, fn);
      client.calculateAccess();
      callback();
    } else if (client.access.allowed && client.application) {
      var fnWrapper = function() {
        if (fn && fn.meta) {
          var vd = api.definition.validate(client.parameters, fn.meta, 'parameters', true);
          if (!vd.valid) {
            client.context.data = fn.meta;
            client.res.statusCode = 400;
            fn = null;
          }
        }
        if (typeof(fn) === 'function') {
          try {
            // Execute Impress handlers
            if (fn.length === 2) fn(client, function(result, errorCode, headers) {
              if (typeof(result) !== 'undefined') client.context.data = result;
              if (errorCode) client.res.statusCode = errorCode;
              if (headers && !client.res.headersSent) {
                if (typeof(headers) === 'string') client.res.setHeader('Content-Type', headers);
                else for (var headerName in headers) client.res.setHeader(headerName, headers[headerName]);
              }
              callback();
            });
            // Execute middleware handlers
            else if (fn.length === 3) fn(client.req, client.res, callback);
            else callback();
          } catch(err) {
            client.err = err;
            application.catchException(err);
          }
        } else callback();
      };
      // Refactor: remove .client link from domain because multiple clients within domain may overlap
      application.domain.client = client;
      if (handler === 'lazy') {
        setImmediate(function() {
          application.domain.run(fnWrapper);
        });
        callback();
        callback = api.impress.emptyness;
      } else application.domain.run(fnWrapper);
    } else callback();
  });
};

// Render template from file or cache
//   callback(tpl)
//
Client.prototype.template = function(data, file, cursor, callback) {
  var client = this,
      application = client.application;

  var fileName, filePath, fileCache, relPath,
      files = [];
  if (client.logged) {
    if (client.user && client.user.group) files.push(file + '.' + client.user.group);
    files.push(file + '.everyone');
  }
  files.push(file);
  // Detect cache or file exists
  api.async.detectSeries(files, function(item, callback) {
    fileName = item + '.template';
    filePath = client.execPathDir + fileName;
    relPath = application.relative(filePath);
    fileCache = application.cache.files[relPath];
    if (fileCache === impress.FILE_EXISTS) callback(true);
    else api.fs.exists(filePath, callback);
  }, function(result) {
    if (fileCache) {
      if (fileCache === impress.FILE_EXISTS) client.include(data, filePath, cursor, callback);
      else callback(impress.TPL_NOT_FOUND + relPath);
    } else if (result) {
      client.include(data, filePath, cursor, callback);
      application.cache.files[relPath] = impress.FILE_EXISTS;
      application.watchCache(api.path.dirname(relPath));
    } else {
      // Try to find template in parent directory
      if (client.execPath !== '/' && client.execPath !== '/app' && client.execPath !== '.') {
        client.execPath = api.impress.dirname(client.execPath);
        client.execPathDir = application.dir + '/app' + client.execPath;
        client.template(data, file, cursor, callback);
        application.watchCache('/app' + api.impress.stripTrailingSlash(client.execPath));
      } else {
        // Lose hope to find template and save cache
        application.cache.files[relPath] = impress.FILE_NOT_FOUND;
        application.watchCache(relPath);
        callback(impress.TPL_NOT_FOUND + relFile);
      }
    }
  });
};

// Include template
//   callback(tpl)
//
Client.prototype.include = function(data, filePath, cursor, callback) {
  var client = this,
      application = client.application;

  var relPath = application.relative(filePath),
      cache = application ? application.cache.templates[relPath] : null;
  if (cache) {
    if (cache === impress.FILE_IS_EMPTY) callback('');
    else client.render(data, cache, cursor, callback);
  } else {
    api.fs.readFile(filePath, 'utf8', function(err, tpl) {
      if (err) callback(impress.TPL_NOT_FOUND + filePath);
      else {
        if (!tpl) tpl = impress.FILE_IS_EMPTY;
        else {
          tpl = tpl.replace(/^[\uBBBF\uFEFF]/, '');
          if (!tpl) tpl = impress.FILE_IS_EMPTY;
        }
        if (application) application.cache.templates[relPath] = tpl;
        client.render(data, tpl, cursor, callback);
      }
    });
    filePath = application.relative(api.path.dirname(filePath));
    application.watchCache(filePath);
  }
};

// Render template from variable
//   callback(tpl)
//
Client.prototype.render = function(data, tpl, cursor, callback) {
  var client = this;

  // parse template into structure
  if (tpl !== impress.FILE_IS_EMPTY) {
    var structure = [],
        pos, tplInclude, dataInclude, tplBody, arrayIndex, dataItem;
    while (tpl.length > 0) {
      // get tpl before includes
      pos = tpl.indexOf('@[');
      if (pos >= 0) {
        structure.push({ type: 'plain', tpl: tpl.substr(0, pos) });
        tpl = tpl.substring(pos + 2);
        // get include name
        pos = tpl.indexOf(']@');
        tplInclude = tpl.substr(0, pos);
        tpl = tpl.substring(pos + 2);
        dataInclude = api.impress.getByPath(data, (cursor ? cursor + '.' : '') + tplInclude);
        // find inline templates
        pos = tpl.indexOf('@[/' + tplInclude + ']@');
        arrayIndex = 0;
        if (pos >= 0) {
          tplBody = tpl.substr(0, pos);
          if (Array.isArray(dataInclude)) {
            for (dataItem in dataInclude) structure.push({
              type: 'inline', name: tplInclude + '.' + arrayIndex++, tpl: tplBody
            });
          } else structure.push({ type: 'inline', name: tplInclude, tpl: tplBody });
          tpl = tpl.substring(pos + 5 + tplInclude.length);
        } else {
          // handle included templates
          if (Array.isArray(dataInclude)) {
            for (dataItem in dataInclude) structure.push({
              type: 'include', name: tplInclude + '.' + arrayIndex++
            });
          } else structure.push({ type: 'include', name: tplInclude });
        }
      } else {
        structure.push({ type: 'plain', tpl: tpl });
        tpl = '';
      }
    }
    // generate result from structure
    var result = '';
    api.async.eachSeries(structure, function(item, callback) {
      var cursorNew;
      if (item.type === 'plain') {
        result += api.impress.subst(item.tpl, data, cursor);
        callback();
      } else if (item.type === 'inline') {
        cursorNew = (cursor === '') ? item.name : cursor + '.' + item.name;
        client.render(data, item.tpl, cursorNew, function(tpl) {
          result += tpl;
          callback();
        });
      } else if (item.type === 'include') {
        cursorNew = (cursor === '') ? item.name : cursor + '.' + item.name;
        client.execPath = client.realPath;
        client.execPathDir = client.realPathDir;
        client.template(data, item.name, cursorNew, function(tpl) {
          if (tpl === impress.FILE_IS_EMPTY) callback();
          else {
            result += tpl || impress.TPL_NOT_FOUND + item.name;
            callback();
          }
        });
      }
    }, function() {
      callback(result);
    });
  } else callback('');
};

// Send static file and drop connection
//   callback - if not static
//
Client.prototype.static = function(callback) {
  var client = this,
      application = client.application;

  if (client.path === '/') callback();
  else {
    var filePath = api.impress.stripTrailingSlash(application.dir + '/static' + client.path),
        relPath = application.relative(filePath),
        buffer = application.cache.static[application.relative(filePath)];
    if (buffer) {
      if (typeof(buffer) !== 'number') {
        var sinceTime = client.req.headers['if-modified-since'];
        if (sinceTime && api.impress.isTimeEqual(sinceTime, buffer.stats.mtime)) client.error(304);
        else {
          client.stats = buffer.stats;
          client.compressed = buffer.compressed;
          client.end(buffer.data);
        }
      } else callback();
    } else api.fs.stat(filePath, function(err, stats) {
      if (err) {
        application.cache.static[relPath] = impress.FILE_NOT_FOUND;
        application.watchCache(api.path.dirname(relPath));
        //application.log.error(impress.CANT_READ_FILE + filePath);
        callback();
      } else {
        var sinceTime = client.req.headers['if-modified-since'];
        if (sinceTime && api.impress.isTimeEqual(sinceTime, stats.mtime)) client.error(304);
        else if (stats.isDirectory()) {
          var appPath = api.impress.stripTrailingSlash(application.dir + '/static' + client.path);
          api.fs.stat(appPath, function(err, stats) {
            if (stats && stats.isDirectory()) callback();
            else client.index(filePath);
          });
        } else if (stats.size < application.config.files.cacheMaxFileSize) client.compress(filePath, stats);
        else client.stream(filePath, stats);
      }
    });
  }
};

// Refresh static in memory cache with compression and minification
//
Client.prototype.compress = function(filePath, stats) {
  var client = this,
      application = client.application;

  application.compress(filePath, stats, function(err, data, compressed) {
    if (err) client.error(404);
    else {
      client.stats = stats;
      client.compressed = compressed;
      client.end(data);
    }
  });
};
