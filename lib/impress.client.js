"use strict";

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
  this.application = application;
  this.startTime = new Date().getTime();
  this.access = clone(impress.defaultAccess);
  this.calculateAccess();
  this.query = api.querystring.parse(url.query);
  this.schema = (!req.connection.server) ? 'https' : 'http';
  this.method = req.method.toLowerCase();
  this.slowTime = server.slowTime;
  this.url = url.pathname;
  this.host = impress.parseHost(req.headers.host);
  this.path = trailingSlash(this.url);
  this.pathDir = application.appDir+this.path;
  this.realPath = this.path;
  this.realPathDir = this.pathDir;
  this.execPath = this.path;
  this.execPathDir = this.pathDir;
  this.ext = impress.fileExt(this.path);
  this.typeExt = this.ext || 'html';
  this.ip = (
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  );
  this.local = inArray(impress.localIPs, this.ip);
};

impress.Client = Client;
impress.Client.prototype.application = impress;

// Client class factory
//
impress.createApplicationClientClass = function(application, mixin) {

  var ApplicationClientClass = function(req, res) {
    this.constructor.apply(this, arguments);
  };

  ApplicationClientClass.prototype = Object.create(Client.prototype);
  ApplicationClientClass.prototype.application = application;

  for (var property in mixin) ApplicationClientClass.prototype[property] = mixin[property];

  return ApplicationClientClass;

};

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
      if (geo) location = geo.country+'/'+geo.region+'/'+geo.city;
    }
    var processingTime = client.endTime-client.startTime,
        msg = (
          processingTime+'ms\t'+
          client.ip+'\t'+
          location+'\t'+
          ((client.user ? client.user.login : '-') || '-')+'\t'+
          (client.sid || '-')+'\t'+
          client.req.socket.bytesRead+'\t'+
          client.req.socket.bytesWritten+'\t'+
          client.req.method+'\t'+
          client.res.statusCode+'\t'+
          client.schema+'://'+client.req.headers.host+client.url+'\t'+
          client.req.headers['user-agent']+'\t'+
          client.req.headers['referer']
        );
    application.log.access(msg);
    if (client.endTime-client.startTime >= client.slowTime) application.log.slow(msg);
  }
};

// Fork long worker
//
Client.prototype.fork = function(workerFile) {
  var clientData = api.stringify({
    url: this.url,
    query: this.query,
    sid: this.sid,
    session: this.session,
    context: this.context,
    fields: this.fields
  });
  if (this.user) clientData.user = {
    userId: this.user.userId,
    access: this.user.access,
    data: this.user.data
  };
  var fileName = this.pathDir+workerFile+'.js';
  if (this.application) {
    if (api.cluster.isMaster) impress.forkLongWorker(this.application.name, fileName, clientData);
    else process.send({
      name: 'impress:forklongworker',
      appName: this.application.name,
      workerFile: fileName,
      clientData: clientData
    });
  }
};

// Kill long worker
//
Client.prototype.killLongWorker = function(workerFile) {
  var fileName = this.pathDir+workerFile+'.js';
  if (this.application) {
    if (api.cluster.isMaster) impress.killLongWorker(this.application.name, fileName);
    else process.send({
      name: 'impress:killlongworker',
      appName: this.application.name,
      workerFile: fileName
    });
  }
};

// Start session
//
Client.prototype.startSession = function() {
  if (this.application && !this.session) {
    this.sid = impress.generateSID(this.application.config);
    this.user = {};
    this.session = {};
    this.sessionModified = true;
    this.sessionCreated = true;
    this.setCookie(this.application.config.sessions.cookie, this.sid);
    if (impress.config.cluster.cookie) this.setCookie(impress.config.cluster.cookie, impress.nodeId);
    this.application.sessions[this.sid] = this.session;
  }
};

// Destroy session
//
Client.prototype.destroySession = function() {
  if (this.application && this.session) {
    this.deleteCookie(this.application.config.sessions.cookie);
    this.deleteCookie(impress.config.cluster.cookie);
    // clear other structures
    var userId = this.session.userId;
    if (userId && this.application.users[userId]) delete this.application.users[userId].sessions[this.sid];
    delete this.application.sessions[this.sid];
    // TODO: delete session from MongoDB persistent session storage
    if (impress.security) impress.security.deletePersistentSession(this.sid);
    this.sid = null;
    this.user = null;
    this.session = null;
  }
};

// Set cookie name=value, host is optional
//
Client.prototype.setCookie = function(name, value, host, httpOnly) {
  var expires = new Date(2100,1,1).toUTCString();
  host = host || this.req.headers.host;
  var pos = host.indexOf(':');
  if (pos>-1) host = host.substring(0, pos);
  if (typeof(httpOnly) === 'undefined') httpOnly = true;
  this.cookies.push(name+'='+value+'; expires='+expires+'; Path=/; Domain='+host+ (httpOnly ? '; HttpOnly' : ''));
};

// Delete cookie by name
//
Client.prototype.deleteCookie = function(name) {
  this.cookies.push(name+'=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain=.'+this.req.headers.host);
};

// Send cookies prepared in client.cookies
//
Client.prototype.sendCookie = function() {
  if (this.cookies && this.cookies.length && !this.res.headersSent) this.res.setHeader('Set-Cookie', this.cookies);
};

// Route request to external HTTP server
//
Client.prototype.proxy = function(host, port, url) {
  var client = this,
      application = client.application;

  var req = api.http.request(
    {
      hostname: host,
      port: port,
      path: url,
      method: client.req.method
    },
    function(response) {
      client.res.writeHead(response.statusCode, response.headers);
      response.on('data', function(chunk) {
        client.res.write(chunk);
      });
      response.on('end', function() { client.end(); });
    }
  );
  req.on('error', function(e) {
    if (application && application.log) application.log.error(
      'Error proxying request: '+e.message
    );
  });
  req.end();
  impress.stat.responseCount++;
};

// Restore session if available
//
Client.prototype.restoreSession = function() {
  var client = this,
      application = client.application;

  if (application) {
    // Parse cookies
    client.cookies = [];
    if (client.req.headers.cookie) client.req.headers.cookie.split(';').forEach(function(cookie) {
      var parts = cookie.split('=');
      client.cookies[parts[0].trim()] = (parts[1] || '').trim();
    });
    // Detect session, restore session or delete cookie
    var sid = client.cookies[application.config.sessions.cookie];
    if (sid) {
      if (impress.validateSID(application.config, sid)) {
        if (impress.security && application.sessions[sid]) {
          client.sid = sid;
          client.session = application.sessions[sid];
          client.logged = !!client.session.userId;
          if (impress.security) client.user = impress.security.getSessionUser(application, sid);
          client.processing();
        } else {
          if (application.config.sessions.persist && impress.security) {
            impress.security.restorePersistentSession(client, sid, function(err, session) {
              if (session) {
                client.sid = sid;
                client.session = session;
                client.user = impress.security.getSessionUser(application, sid);
                client.logged = !!client.session.userId;
              } else client.deleteCookie(application.config.sessions.cookie);
              client.processing();
            });
          } else client.processing();
        }
      } else {
        client.deleteCookie(application.config.sessions.cookie);
        client.processing();
      }
    } else client.processing();
  }
};

// Save session
//
Client.prototype.saveSession = function(callback) {
  if (this.application && this.session && impress.security && this.application.config.sessions.persist) {
    if (this.session && (this.sessionCreated || this.sessionModified)) {
      impress.security.savePersistentSession(this, this.sid, callback);
    } else callback();
  } else callback();
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
      client.end(cache.data);
    } else {
      client.ext = impress.fileExt(client.realPath);
      client.typeExt = client.ext || 'html';
      client.handlers = [ 'access', 'request', client.method ];
      client.context = {};

      // Set Content-Type if detected and not SSE
      if (client.typeExt === 'sse') client.eventChannel = null;
      else if (client.typeExt !== 'ws' && !client.res.headersSent) {
        var contentType = impress.mimeTypes[client.typeExt];
        if (contentType) client.res.setHeader('Content-Type', contentType);
        if (application.config.application && application.config.application.allowOrigin) {
          client.res.setHeader('Access-Control-Allow-Origin', application.config.application.allowOrigin);
          client.res.setHeader('Access-Control-Allow-Headers', 'origin, content-type, accept');
        }
      }

      // Execute handlers
      api.async.eachSeries(client.handlers, function(handler, callback) {
        if (handler === 'access' || client.access.virtual || client.path === client.realPath ) {
          client.execPath = client.realPath;
          client.execPathDir = client.realPathDir;
          client.fileHandler(handler, callback);
        } else { client.error(404); callback(); }
      }, function() {
        if (!client.res.headersSent) {
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
                client.res.setHeader('WWW-Authenticate', 'Basic realm="'+realm+'"');
                client.error(401);
                return;
              }
            }
            if (client.ext === '' && client.access.intro) {
              client.introspect();
            } else if (client.typeExt === 'html' || client.typeExt === 'ajax') {
              client.processingPage();
            } else if (client.typeExt === 'sse') {
              if (application.sse) client.sseConnect();
              else client.error(510);
            } else if (client.typeExt === 'ws') {
              if (application.websocket) application.websocket.finalize(client);
              else client.error(510);
            } else if (client.typeExt === 'json') {
              var output = api.stringify(client.context.data);
              if (!output) client.error(404);
              else client.end(output);
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
  var client = this,
      application = client.application;

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
  this.context.cache = duration(timeout);
};

// End request
//
Client.prototype.end = function(output, socket) {
  var client = this,
      application = client.application;

  client.saveSession(function() {
    client.sendCookie();
    client.res.end(output);
    client.accessLog();
    if (socket) socket.destroy();
    impress.stat.responseCount++;

    // Save in cache
    if (client.context && client.context.cache) {
      application.cache.pages[client.realPath] = {
        expireTime: client.startTime+client.context.cache,
        statusCode: client.res.statusCode,
        contentType: client.res.getHeader('content-type'),
        data: output
      };
    }
  });
};

// End request with HTTP error code
//
Client.prototype.error = function(code, socket) {
  var client = this;

  client.res.statusCode = code;
  if (code === 304) client.end(); else {
    if (client.typeExt === 'json') client.end('{"statusCode":'+code+'}'); else {
      if (!client.res.headersSent) client.res.setHeader('Content-Type', impress.mimeTypes['html']);
      var message = impress.httpErrorCodes[code] || 'Unknown error';
      this.include({ title:'Error '+code, message:message }, impress.templatesDir+'error.template', '', function(tpl) {
        client.end(tpl, socket);
      });
    }
  }
};

// Directory index
//
Client.prototype.index = function(indexPath) {
  var client = this;

  client.execPath = client.realPath;
  client.execPathDir = client.realPathDir;
  client.fileHandler('access', function() {
    if (client.access.index) {
      if (!client.res.headersSent) client.res.setHeader('Content-Type', impress.mimeTypes['html']);
      var files = [], dirs = [], dirPath = '';
      client.url.split('/').forEach(function(dir) {
        if (dir !== '') {
          dirPath = dirPath+'/'+dir;
          dirs.push({ name:dir, path:dirPath+'/' });
        }
      });
      api.fs.readdir(indexPath, function(err, flist) {
        if (err) application.log.error(impress.canNotReadDirectory+indexPath);
        else {
          var cbCount = flist.length, cbIndex = 0;
          var cb = function() {
            files.sort(impress.sortCompareDirectories);
            client.include(
              { title:'Directory index', path:client.url, files:files, dirs:dirs },
              impress.templatesDir+'index.template', '',
              function(tpl) { client.end(tpl); }
            );
          };
          files.push({ name:'/..', path:'..', size:'up', mtime:' ' });
          if (flist.length > 0) {
            for (var i = 0; i < flist.length; i++) {
              (function() {
                var fileName = flist[i],
                    filePath = indexPath+'/'+fileName;
                api.fs.stat(filePath, function(err, stats) {
                  if (!err) {
                    var mtime = stats.mtime.toSimpleString();
                    if (stats.isDirectory()) files.push({ name:'/'+fileName, path:fileName+'/', size:'dir', mtime:mtime });
                    else files.push({ name:fileName, path:fileName, size:bytesToSize(stats.size), mtime:mtime });
                  }
                  if (++cbIndex>=cbCount) cb();
                });
              } ());
            }
          } else cb();
        }
      });
    } else client.error(403);
  });
};

// API Introspection
//
Client.prototype.introspect = function() {
  var client = this,
      application = client.application;

  if (client.req.url.slice(-1) !== '/') {
    client.redirect(client.path);
    client.end();
    return;
  }
  api.fs.stat(client.pathDir, function(err, stats) {
    if (err) client.error(404);
    else {
      if (stats.isDirectory()) {
        var files = [], dirs = [], dirPath = '';
        client.url.split('/').forEach(function(dir) {
          if (dir !== '') {
            dirPath = dirPath+'/'+dir;
            dirs.push({ name:dir, path:dirPath+'/' });
          }
        });
        application.preloadDirectory(client.path, 2, function() {
          api.fs.readdir(client.pathDir, function(err, flist) {
            if (err) application.log.error(impress.canNotReadDirectory+client.pathDir);
            else {
              var cbCount = flist.length, cbIndex = 0;
              var cb = function () {
                files.sort(impress.sortCompareByName);
                client.include(
                  { title: 'API Introspection index', path: client.url, files: files, dirs: dirs },
                    impress.templatesDir + 'introspection.template', '',
                  function (tpl) {
                    client.end(tpl);
                  }
                );
              };
              files.push({ name: '/..', path: '..', method: 'up', mtime: ' ' });
              if (flist.length > 0) {
                for (var i = 0; i < flist.length; i++) {
                  (function () {
                    var fileName = flist[i],
                        filePath = client.pathDir + fileName;
                    api.async.parallel({
                      stats: function (callback) {
                        api.fs.stat(filePath, function (err, stats) {
                          callback(null, stats);
                        });
                      },
                      get: function (callback) {
                        api.fs.exists(filePath + '/get.js', function (exists) {
                          callback(null, exists);
                        });
                      },
                      post: function (callback) {
                        api.fs.exists(filePath + '/post.js', function (exists) {
                          callback(null, exists);
                        });
                      }
                    }, function (err, results) {
                      if (results.stats) {
                        var mtime = results.stats.mtime.toSimpleString();
                        if (results.stats.isDirectory()) {
                          var ext = impress.fileExt(fileName),
                              method = 'unknown';
                          if (ext === 'json') method = '';
                          else if (ext === 'ajax') method = 'AJAX Handler';
                          else if (ext === 'sse') method = 'Server-Sent Events';
                          else if (ext === 'ws') method = 'WebSocket';
                          else if (ext === '') method = 'dir';
                          // Read metadata
                          if (ext === 'json') {
                            var exports, parName, parameter;
                            impress.httpVerbs.forEach(function (verb) {
                              if (results[verb]) {
                                exports = application.cache.scripts[filePath + '/' + verb + '.js'];
                                if (exports && exports.meta) {
                                  method += verb.toUpperCase() + ' ' + fileName + ' ' + exports.meta.description + '<ul>';
                                  for (parName in exports.meta.par) {
                                    parameter = exports.meta.par[parName];
                                    method += '<li>' + parName + ' - ' + parameter + '</li>';
                                  }
                                  method += '<li>Result: ' + exports.meta.result + '</li></ul>';
                                }
                              }
                              if (method === '') method = 'JSON Handler (no metadata)';
                            });
                          }
                          files.push({ name: '/' + fileName, path: fileName + '/', method: method, mtime: mtime });
                        }
                        if (++cbIndex >= cbCount) cb();
                      }
                    });
                  }());
                }
              } else cb();
            }
          });
        });
      } else client.error(403);
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

// Find existent file to execute
//
Client.prototype.fileHandler = function(file, callback) {
  var client = this,
      application = client.application;

  var fileName = file+'.js',
      filePath = client.execPathDir+fileName,
      fileCache = application.cache.files[filePath];
  if (fileCache) {
    if (fileCache !== impress.fileNotFound) client.execute(fileCache, callback);
    else callback();
  } else api.fs.exists(filePath, function(exists) {
    var fileOriginal;
    if (exists) {
      client.execute(filePath, callback);
      fileOriginal = client.pathDir+fileName;
      application.cache.files[fileOriginal] = filePath;
      impress.watchCache(application, fileOriginal);
    } else {
      // Try to process request on parent directory
      if (client.execPath !== '/' && file !== 'meta') {
        client.execPath = trailingSlash(api.path.dirname(client.execPath));
        client.execPathDir = application.appDir+client.execPath;
        client.fileHandler(file, callback);
        impress.watchCache(application, client.execPathDir);
      } else {
        // Lose hope to execute request and drop connection
        // if (file !== 'meta') client.error(404);
        callback();
        fileOriginal = client.pathDir+fileName;
        application.cache.files[fileOriginal] = impress.fileNotFound;
        impress.watchCache(application, fileOriginal);
      }
    }
  });
};

// Find nearest existent folder
//
Client.prototype.detectRealPath = function(callback) {
  var client = this,
      application = client.application;

  var folderCache = application.cache.folders[client.realPathDir];
  if ((folderCache && folderCache !== impress.fileExists) || client.realPath === '/') callback();
  else api.fs.exists(client.realPathDir, function(exists) {
    if (exists) {
      application.cache.folders[client.realPath] = impress.fileExists;
      callback();
    } else {
      client.realPath = trailingSlash(api.path.dirname(client.realPath));
      client.realPathDir = application.appDir+client.realPath;
      client.detectRealPath(callback);
    }
    impress.watchCache(application, client.realPathDir);
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
        inArray(this.access.groups, this.user.group) ||
        inArray(this.access.groups, 'local') && this.local
      )
    )
  );
};

// Execute existent file from cache or disk
//
Client.prototype.execute = function(filePath, callback) {
  if (this.access.allowed && this.application) this.application.runScript(filePath, this, callback);
  else callback();
};

// Render template from file or cache
//   callback(tpl)
//
Client.prototype.template = function(data, file, cursor, callback) {
  var client = this,
      application = client.application;

  var fileName, filePath, fileCache,
      files = [];
  if (client.logged) {
    if (client.user && client.user.group) files.push(file+'.'+client.user.group);
    files.push(file+'.everyone');
  }
  files.push(file);
  // Detect cache or file exists
  api.async.detectSeries(files, function(item, callback) {
    fileName = item+'.template';
    filePath = client.execPathDir+fileName;
    fileCache = application.cache.files[filePath];
    if (fileCache) callback(true);
    else api.fs.exists(filePath, callback);
  }, function(result) {
    var fileOriginal;
    if (fileCache) {
      if (fileCache !== impress.fileNotFound) client.include(data, fileCache, cursor, callback);
      else callback(impress.templateNotFound+file);
    } else if (result) {
      client.include(data, filePath, cursor, callback);
      fileOriginal = client.execPathDir+fileName;
      application.cache.files[fileOriginal] = filePath;
      impress.watchCache(application, fileOriginal);
    } else {
      // Try to find template in parent directory
      if ((client.execPath !== '/') && (client.execPath !== '.')) {
        client.execPath = trailingSlash(api.path.dirname(client.execPath));
        client.execPathDir = application.appDir+client.execPath;
        client.template(data, file, cursor, callback);
        impress.watchCache(application, client.execPathDir);
      } else {
        // Lose hope to find template and save cache
        fileOriginal = client.execPathDir+fileName;
        application.cache.files[fileOriginal] = impress.fileNotFound;
        impress.watchCache(application, fileOriginal);
        callback(impress.templateNotFound+file);
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

  var cache = application ? application.cache.templates[filePath] : null;
  if (cache) {
    if (cache === impress.fileIsEmpty) callback('');
    else client.render(data, cache, cursor, callback);
  } else {
    api.fs.readFile(filePath, 'utf8', function(err, tpl) {
      if (err) callback(impress.templateNotFound+filePath);
      else {
        if (!tpl) tpl = impress.fileIsEmpty; else {
          tpl = tpl.replace(/^[\uBBBF\uFEFF]/, '');
          if (!tpl) tpl = impress.fileIsEmpty;
        }
        if (application) application.cache.templates[filePath] = tpl;
        client.render(data, tpl, cursor, callback);
      }
    });
    impress.watchCache(application, filePath);
  }
};

// Render template from variable
//   callback(tpl)
//
Client.prototype.render = function(data, tpl, cursor, callback) {
  // parse template into structure
  if (tpl !== impress.fileIsEmpty) {
    var structure = [],
        pos, tplInclude, dataInclude, tplBody, arrayIndex;
    while (tpl.length>0) {
      // get tpl before includes
      pos = tpl.indexOf('@[');
      if (pos >= 0) {
        structure.push({ type:'plain', tpl:tpl.substr(0, pos) });
        tpl = tpl.substring(pos+2);
        // get include name
        pos = tpl.indexOf(']@');
        tplInclude = tpl.substr(0, pos);
        tpl = tpl.substring(pos+2);
        dataInclude = impress.dataByPath(data, (cursor ? cursor+'.' : '')+tplInclude);
        // find inline templates
        pos = tpl.indexOf('@[/'+tplInclude+']@');
        arrayIndex = 0;
        var dataItem;
        if (pos >= 0) {
          tplBody = tpl.substr(0, pos);
          if (Array.isArray(dataInclude)) {
            for (dataItem in dataInclude) structure.push({
              type:'inline', name:tplInclude+'.'+arrayIndex++, tpl:tplBody
            });
          } else structure.push({type:'inline', name:tplInclude, tpl:tplBody});
          tpl = tpl.substring(pos+5+tplInclude.length);
        } else {
          // handle included templates
          if (Array.isArray(dataInclude)) {
            for (dataItem in dataInclude) structure.push({
              type:'include', name:tplInclude+'.'+arrayIndex++
            });
          } else structure.push({ type:'include', name:tplInclude });
        }
      } else {
        structure.push({ type:'plain', tpl:tpl });
        tpl = '';
      }
    }
    // generate result from structure
    var result = '',
        client = this;
    api.async.eachSeries(structure, function(item, callback) {
      var cursorNew;
      if (item.type === 'plain') {
        result += impress.subst(item.tpl, data, cursor);
        callback();
      } else if (item.type === 'inline') {
        cursorNew = (cursor === '') ? item.name : cursor+'.'+item.name;
        client.render(data, item.tpl, cursorNew, function(tpl) {
          result += tpl;
          callback();
        });
      } else if (item.type === 'include') {
        cursorNew = (cursor === '') ? item.name : cursor+'.'+item.name;
        client.execPath = client.realPath;
        client.execPathDir = client.realPathDir;
        client.template(data, item.name, cursorNew, function(tpl) {
          if (tpl === impress.fileIsEmpty) callback();
          else {
            result += tpl || impress.templateNotFound+item.name;
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
//
Client.prototype.static = function() {
  if (api.path.basename(this.path) === 'access.js') this.error(403);
  else {
    var client = this,
        application = client.application;

    var filePath = stripTrailingSlash(client.pathDir),
        buffer = application.cache.static[filePath];
    if (buffer) {
      if (buffer !== impress.fileNotFound) {
        var sinceTime = client.req.headers['if-modified-since'];
        if (sinceTime && impress.isTimeEqual(sinceTime, buffer.stats.mtime)) client.error(304);
        else {
          client.res.writeHead(client.res.statusCode, client.baseHeader(client.typeExt, buffer.stats, buffer.compressed));
          client.end(buffer.data);
        }
      } else client.error(404);
    } else api.fs.stat(filePath, function(err, stats) {
      if (err) {
        client.error(404);
        application.cache.static[filePath] = impress.fileNotFound;
        impress.watchCache(application, filePath);
        application.log.error(impress.canNotReadFile+filePath);
      } else {
        var sinceTime = client.req.headers['if-modified-since'];
        if (sinceTime && impress.isTimeEqual(sinceTime, stats.mtime)) client.error(304);
        else {
          if (stats.isDirectory()) client.index(filePath); else {
            if (stats.size < application.config.files.cacheMaxFileSize) {
              client.compress(filePath, stats);
            } else {
              client.res.writeHead(200, client.baseHeader(client.ext, stats));
              // 'Content-disposition', 'attachment; filename=fileName.ext'
              var stream = api.fs.createReadStream(filePath);
              stream.on('error', function (error) {
                application.log.error(impress.canNotReadFile+filePath);
              });
              stream.pipe(client.res);
            }
          }
        }
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
      if (!client.res.headersSent) {
        client.res.writeHead(client.res.statusCode, client.baseHeader(client.ext, stats, compressed));
      }
      client.end(data);
    }
  });
};

// Send HTTP headers
//
Client.prototype.baseHeader = function(ext, stats, compressed) {
  compressed = typeof(compressed) !== 'undefined' ? compressed : false;
  var header = {
    'Content-Type': impress.mimeTypes[ext],
    'Cache-Control': 'public'
  };
  if (!inArray(impress.compressedExt, ext) && compressed) header['Content-encoding'] = 'gzip';
  if (stats) {
    header['Content-Length'] = stats.size;
    header['Last-Modified' ] = stats.mtime.toGMTString();
  }
  return header;
};
