'use strict';

// Application interface for Impress Application Server

const ROUTE_NUM_REGEXP = /\[([0-9]+)]/g;

const PLACES = ['tasks', 'init', 'setup', 'model', 'lib', 'api'];

if (impress.serverProto === 'http') {
  PLACES.push('www', 'static');
}

const TEMPLATES = ['error', 'index', 'introspection'];

const mixin = application => {
  application.isInitialized = false;
  application.ready = false;
  application.backend = api.common.emitter();
  application.frontend = api.common.emitter();

  application.config = new impress.Config(application);
  application.scheduler = new impress.Scheduler(application);
  application.model = {}; // key is model name, value is object
  application.users = new Map(); // key is login, value is instance of User
  application.sessions = new Map(); // key is sid, value is instance of Session
  application.channels = {};
  application.workers = {};
  application.longWorkers = {};
  application.api = {}; // all APIs will be loaded here on start

  if (!application.isImpress) {
    api.firewall.addApplication(application);
  }

  application.createApplication = callback => {
    impress.createSandbox(application, () => {
      application.config.loadConfig(() => {
        application.loadDatabases(() => {
          application.loadPlaces(() => {
            application.loadApi(() => {
              application.ready = true;
              application.emit('started');
              callback();
            });
          });
        });
      });
    });
  };

  // Initialize properties after config loaded
  application.start = () => {
    application.nodeId = impress.nodeId;
    application.serverId = impress.config.sections.scale.server;
    application.cloudInstance = impress.config.sections.scale.instance;
    application.emit('start');
  };

  application.loadDatabases = callback => {
    api.db.openApplicationDatabases(application, callback);
  };

  application.logException = err => {
    let stack = err.stack || err.toString();
    stack = impress.shortenStack(stack);
    if (err.isWarning && impress.log && impress.log.warn) {
      stack = stack.replace(/^Error: /, 'Warning: ');
      impress.log.warn(stack);
    } else {
      impress.log.error(stack);
    }
  };

  application.accessLog = client => {
    const endTime = Date.now();
    let geoLocation = '-';
    if (api.geoip) {
      const geo = api.geoip.lookup(client.ip);
      if (geo) geoLocation = geo.country + '/' + geo.region + '/' + geo.city;
    }
    const elapsed = endTime - client.startTime;
    const time = elapsed.toString() + 'ms';
    const login = client.user ? client.user.login : '-';
    const session = client.sid || '-';
    const agent = client.req.headers['user-agent'] || '-';
    const referer = client.req.headers['referer'] || '-';
    const msg = application.name + '\t' + time + '\t' +
      client.ip + '\t' + geoLocation + '\t' +
      login + '\t' + session + '\t' +
      client.socket.bytesRead + '\t' +
      client.socket.bytesWritten + '\t' +
      client.req.method + '\t' +
      client.res.statusCode + '\t' +
      client.req.url + '\t' +
      agent + '\t' + referer;
    impress.log.access(msg);
    if (elapsed >= client.slowTime) impress.log.slow(msg);
  };

  const loadTemplate = (tplName, tplPath) => {
    api.fs.access(tplPath, err => {
      if (!err) application.systemTemplates[tplName] = tplPath;
    });
  };

  application.systemTemplates = {};
  for (let j = 0; j < TEMPLATES.length; j++) {
    const tplName = TEMPLATES[j];
    const tplFile = '/templates/' + tplName + '.template';
    const tplPath = application.dir + tplFile;
    application.systemTemplates[tplName] = impress.moduleDir + tplFile;
    loadTemplate(tplName, tplPath);
  }

  // Relative path
  //   path <string> absolute path
  // Returns: application relative path
  application.relative = path => path.substr(application.dir.length);

  // Preload Directory
  //   relPath <string> relative path from /www
  //   depth <number> recursion depth, 0 - maximum, 1 - one level (no recursion)
  //   callback <Function> preload finished (err, directories)
  application.preloadDirectory = (relPath, depth, callback) => {
    callback = api.common.once(callback);
    if (depth === undefined) depth = 0;
    const absPath = application.dir + '/www' + relPath;
    api.fs.readdir(absPath, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + absPath);
        callback(err);
        return;
      }
      const directories = [];
      if (files.length === 0) {
        callback(null, directories);
        return;
      }
      api.metasync.each(files, (fileName, cb) => {
        const fileExt = api.common.fileExt(fileName);
        const filePath = api.common.addTrailingSlash(absPath) + fileName;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            cb();
            return;
          }
          if (stats.isDirectory() && (depth === 0 || depth > 1)) {
            directories.push(fileName);
            application.preloadDirectory(
              api.common.addTrailingSlash(relPath) + fileName,
              depth - 1, cb
            );
          } else if (fileExt === 'js') {
            impress.createScript(application, filePath, cb);
          } else {
            cb();
          }
        });
      }, () => {
        callback(null, directories);
      });
      application.cache.watch(relPath);
    });
  };

  application.loadApi = callback => {
    const relPath = '/api/';
    const absPath = application.dir + relPath;
    api.fs.readdir(absPath, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + absPath);
        callback();
        return;
      }
      if (files.length === 0) {
        callback(null);
        return;
      }
      api.metasync.each(files, (fileName, cb) => {
        const filePath = absPath + fileName;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            impress.log.error(impress.CANT_READ_FILE + filePath);
            cb();
            return;
          }
          if (!stats.isDirectory()) {
            cb();
            return;
          }
          application.loadApiInterface(fileName, filePath, cb);
        });
      }, callback);
      application.cache.watch(relPath);
    });
  };

  application.loadApiInterface = (interfaceName, path, callback) => {
    const relPath = '/api/' + interfaceName;
    const apiInterface = {};
    application.api[interfaceName] = apiInterface;
    api.fs.readdir(path, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + relPath);
        callback(err);
        return;
      }
      if (files.length === 0) {
        callback(null);
        return;
      }
      api.metasync.each(files, (fileName, cb) => {
        const fileExt = api.common.fileExt(fileName);
        if (fileExt !== 'js') {
          cb();
          return;
        }
        const methodName = api.common.removeExt(fileName);
        const filePath = path + '/' + fileName;
        api.fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            cb();
            return;
          }
          impress.createScript(application, filePath, (err, exports) => {
            if (err) {
              cb(err);
              return;
            }
            apiInterface[methodName] = exports;
            cb();
          });
        });
      }, callback);
      application.cache.watch(relPath);
    });
  };

  application.loadPlaces = callback => {
    api.metasync.each(PLACES, (placeName, cb) => {
      application.loadPlaceScripts(placeName, cb);
    }, callback);
    application.cache.watch('/model');
  };

  application.loadPlaceScripts = (placeName, callback) => {
    if (placeName === 'static') {
      callback();
      return;
    }
    const path = application.dir + '/' + placeName;
    api.fs.access(path, err => {
      if (err) {
        callback();
        return;
      }
      api.fs.readdir(path, (err, files) => {
        if (err) {
          impress.log.error(
            impress.CANT_READ_DIR + application.dir + '/config'
          );
          callback();
        } else {
          api.metasync.each(files, (file, cb) => {
            application.processPlaceFile(placeName, path, file, () => {
              application.loadPlaceFile(placeName, path, file, cb);
            }, cb);
          }, callback);
        }
      });
      if (placeName !== 'setup') application.cache.watch('/' + placeName);
    });
  };

  application.processPlaceFile = (placeName, path, file, load, pass) => {
    if (!file.endsWith('.js')) {
      pass();
      return;
    }
    if (placeName === 'setup') {
      if (impress.workerId !== 1) {
        pass();
        return;
      }
      application.setupScriptChanged(path, file, changed => {
        if (changed) load();
        else pass();
      });
    } else {
      load();
    }
  };

  application.setupScriptChanged = (path, file, callback) => {
    const scriptName = api.path.basename(file, '.js');
    const scriptPath = path + '/' + file;
    const doneFilePath = path + '/' + scriptName + '.done';
    api.fs.readFile(doneFilePath, (err, data) => {
      if (err) {
        callback(true);
        return;
      }
      const doneDate = new Date(data.toString());
      api.fs.stat(scriptPath, (err, stat) => {
        callback(!err && doneDate < stat.mtime);
      });
    });
  };

  // Load file from place
  //   placeName <string> place name (subdirectory name in application)
  //   path <string> directory path
  //   file <string> file name in place directory
  //   callback <Function> after file loaded
  application.loadPlaceFile = (placeName, path, file, callback) => {
    const sectionName = api.path.basename(file, '.js');
    impress.createScript(application, path + '/' + file, (err, exports) => {
      if (err) {
        callback();
        return;
      }
      if (placeName === 'tasks') {
        application.scheduler.setTask(sectionName, exports);
      } else if (placeName === 'model') {
        application.model[sectionName] = exports;
      } else if (placeName === 'setup') {
        api.fs.writeFile(
          path + '/' + sectionName + '.done', new Date().toISOString(),
          api.common.emptiness
        );
      }
      callback();
    });
  };

  // HTTP Dispatcher
  //   req <IncomingMessage>
  //   res <ServerResponse>
  // Rerurns: <Client>
  application.dispatch = (req, res) => {
    const client = new impress.Client(application, req, res);

    if (application.config.sections.application.slowTime) {
      client.slowTime = application.config.sections.application.slowTime;
    }

    const routes = application.config.sections.routes;
    if (routes) {
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const match = req.url.match(route.urlRx);
        if (match) {
          application.dispatchRoute(client, route, match, i);
          return client;
        }
      }
    }

    client.static(() => {
      const httpGet = impress.HTTP_VERBS.indexOf(client.method) === 0;
      if (httpGet) {
        client.dispatch();
        return;
      }
      const contentType = req.headers['content-type'];
      if (contentType && contentType.startsWith('multipart')) {
        const form = new api.multiparty.Form();
        form.parse(req, (err, fields, files) => {
          if (err) {
            impress.log.error(err);
            client.error(400);
          } else {
            client.files = files;
            client.fields = fields;
            Object.assign(client.parameters, client.fields);
            client.dispatch();
          }
        });
      } else {
        req.on('data', chunk => {
          client.chunks.push(chunk);
        });
        req.on('end', () => {
          client.data = Buffer.concat(client.chunks).toString();
          if (contentType && contentType.startsWith('application/json')) {
            client.fields = api.json.parse(client.data);
          } else {
            client.fields = api.querystring.parse(client.data);
          }
          Object.assign(client.parameters, client.fields);
          client.dispatch();
        });
      }
    });

    return client;
  };

  // Dispatch route
  //   client <Client>
  //   route <name> route name
  //   match <Array> Array of URL elements mached route.urlRx
  //   iRoute <number> route index in application.config.sections.routes
  application.dispatchRoute = (client, route, match, iRoute) => {
    client.slowTime = route.slowTime;
    const req = client.req;
    const res = client.res;
    let urlRoute = req.url;
    if (route.rewrite && match.length > 1) {
      urlRoute = route.rewrite.replace(
        ROUTE_NUM_REGEXP, (s, key) => match[key] || ''
      );
    } else {
      urlRoute = route.rewrite;
    }
    req.usedRoutes = req.usedRoutes || [];
    if (route.host) {
      client.proxy(route.host, route.port || 80, urlRoute);
    } else if (req.usedRoutes.includes(iRoute)) {
      client.error(508);
    } else {
      req.url = urlRoute;
      req.usedRoutes.push(iRoute);
      impress.dispatcher(req, res);
    }
  };

  // Refresh static in memory cache with compression and minification
  //   filePath <string> compressing file path
  //   stats <Stats> instance of fs.Stats
  //   callback <Function>
  //     err <Error>
  //     data <Buffer>
  //     compressed <boolean>
  application.compress = (filePath, stats, callback) => {
    callback = api.common.once(callback);
    api.fs.readFile(filePath, (err, data) => {
      if (err) {
        callback(err);
        return;
      }
      const relPath = application.relative(filePath);
      const ext = api.common.fileExt(filePath);
      const lst = application.config.sections.files.preprocess.includes(ext);
      const minified = ext === 'js' && filePath.endsWith('.min.js');
      if (lst && !minified) {
        const pre = impress.preprocess[ext];
        if (pre) {
          data = pre(data);
          if (data) {
            stats.size = data.length;
          } else {
            callback(new Error(ext + ' parse/preprocess error'));
            application.cache.static.add(relPath, impress.FILE_PARSE_ERROR);
            application.cache.watch(api.path.dirname(relPath));
            return;
          }
        }
      }
      const configured = application.config.sections.files.gzip;
      const compressed = impress.COMPRESSED_EXT.includes(ext);
      const large = stats.size > impress.COMPRESS_ABOVE;
      if (configured && !compressed && large) {
        api.zlib.gzip(data, (err, data) => {
          if (!err) stats.size = data.length;
          callback(err, data, true);
          const cache = { stats, compressed: true, data };
          if (!err) application.cache.static.add(relPath, cache);
        });
      } else {
        callback(null, data, false);
        const cache = { stats, compressed: false, data };
        application.cache.static.add(relPath, cache);
      }
      application.cache.watch(api.path.dirname(relPath));
    });
  };

  application.shutdownLongWorkers = () => {
    for (const workerId in application.longWorkers) {
      application.longWorkers[workerId].kill();
    }
  };

  // Programmatically create HTTP request handler
  //   method <string> http verb (get, post...)
  //   path <string> path for handler
  //   handler <Function> impress functon (2 arg) or middleware (3 arg)
  //   meta <Object> metadata to be set as handler.handler (optional)
  application.handler = (method, path, handler, meta) => {
    const dirPath = '/www' + api.common.addTrailingSlash(path);
    const filePath = dirPath + method + '.js';
    if (meta) handler.meta = meta;
    application.cache.scripts.set(filePath, handler);
    application.cache.files.set(filePath, impress.FILE_EXISTS);
    application.cache.folders.set(dirPath, impress.DIR_EXISTS);
  };

  // Programmatically create handlers for http verbs
  //   application.get(path, handler, meta)
  //   application.post(path, handler, meta)
  //   application.put(path, handler, meta)
  //   application.delete(path, handler, meta)
  impress.HTTP_VERBS.forEach(verb => {
    application[verb] = (path, handler, meta) => {
      application.handler(verb, path, handler, meta);
    };
  });

  // Fork long worker
  //   client <Client> client request to be processes in worker
  //   workerFile <string> handler to be executed in forked process
  application.forkLongWorker = (client, workerFile) => {
    const user = client.user;

    if (application) {
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
      if (user) {
        clientData.user = {
          login: user.login,
          access: user.access,
          data: user.data
        };
      }
      const fileName = client.pathDir + workerFile + '.js';
      impress.forkLongWorker(
        application.name,
        fileName,
        api.json.stringify(clientData)
      );
    }
  }

  // Kill long worker
  //   client <Client> client request
  //   workerFile <string> name of handler file to identify process
  application.killLongWorker = (client, workerFile) => {
    const fileName = client.pathDir + workerFile + '.js';
    impress.killLongWorker(application.name, fileName);
  };

};

module.exports = {
  mixinImpress: mixin,
  mixinApplication: mixin,
};
