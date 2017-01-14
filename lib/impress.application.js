'use strict';

// Application interface for Impress Application Server

impress.application.places = ['tasks', 'init', 'setup', 'model', 'lib', 'api'];

if (impress.serverProto === 'http') {
  impress.application.places.push('www', 'static');
}

impress.application.templates = ['error', 'index', 'introspection'];

// This plugin should be mixed to impress application
//
impress.application.mixImpress = true;

impress.application.mixin = (application) => {

  application.isInitialized = false;
  application.backend = api.common.eventEmitter();
  application.frontend = api.common.eventEmitter();

  application.config = {}; // key is file name, value is object
  application.tasks = {}; // key is task name, value is scheduled Function
  application.model = {}; // key is model name, value is object
  application.users = new Map(); // key is login, value is instance of User
  application.sessions = new Map(); // key is sid, value is instance of Session
  application.channels = {};
  application.workers = {};
  application.longWorkers = {};
  application.api = {}; // all APIs will be loaded here on start

  if (application !== impress) {
    impress.firewall.addApplication(application);
  }

  // Refactor: remove .domain from application
  application.domain = api.domain.create();

  application.createApplication = (callback) => {
    application.createSandbox(() => {
      application.loadConfig(() => {
        application.loadDatabases(() => {
          application.loadPlaces(() => {
            application.loadApi(() => {
              application.emit('started');
              callback();
            });
          });
        });
      });
    });
  };

  application.start = (
    // Initialize properties after config loaded
  ) => {
    application.nodeId = impress.nodeId;
    application.serverId = impress.config.scale.server;
    application.cloudInstance = impress.config.scale.instance;
    application.emit('start');
  };

  application.loadDatabases = (callback) => {
    api.db.openApplicationDatabases(application, callback);
  };

  application.catchException = (err) => {
    if (application.domain.client) {
      // Refactor: remove .client from domain
      application.domain.client.error(500, err);
      application.domain.client = null;
    }
    application.logException(err);
  };

  application.domain.on('error', application.catchException);

  application.logException = (err) => {
    let stack = err.stack;
    if (!stack) stack = err.toString();
    stack = impress.normalizeStack(stack);
    if (err.isWarning && application.log && application.log.warning) {
      stack = stack.replace(/^Error: /, 'Warning: ');
      application.log.warning(stack);
    } else if (application.log && application.log.error) {
      application.log.error(stack);
    } else {
      console.log(err.stack);
    }
  };

  function checkTemplate(templateName, templatePath) {
    api.fs.exists(templatePath, (exists) => {
      if (exists) application.systemTemplates[templateName] = templatePath;
    });
  }

  application.systemTemplates = {};
  let j, jlen, templateName, templatePath;
  for (j = 0, jlen = impress.application.templates.length; j < jlen; j++) {
    templateName = impress.application.templates[j];
    templatePath = application.dir + '/templates/' + templateName + '.template';
    application.systemTemplates[templateName] = (
      impress.moduleDir + '/templates/' + templateName + '.template'
    );
    checkTemplate(templateName, templatePath);
  }

  application.relative = (
    path // absolute path
    // Return: application relative path
  ) => path.substr(application.dir.length);

  application.prepareScript = (
    fileName, // file name (absolute path)
    source // JavaScript code
    // Return: exported function or object exported from script
  ) => {
    const fn = application.relative(fileName);
    const scriptDir = (
      application.isImpress ? impress.dir : impress.applicationsDir
    );
    const scriptName = fileName.replace(scriptDir, '');
    try {
      let code;
      if (source[0] === impress.ASCII_BRACE) {
        code = impress.USE_STRICT + '(' + source + ')';
      } else {
        code = impress.USE_STRICT + source;
      }
      const script = api.vm.createScript(code, scriptName);
      application.sandbox.module = {};
      application.sandbox.__filename = fn;
      application.sandbox.__dirname = api.path.dirname(fn);
      const expr = script.runInNewContext(application.sandbox);
      let exports = application.sandbox.module.exports;
      if (!exports) exports = expr;
      application.sandbox.module = {};
      const key = application.relative(fileName);
      application.cache.scripts.set(key, exports);
      return exports;
    } catch (err) {
      err.stack = err.toString() + ' in ' + scriptName;
      application.logException(err);
      return null;
    }
  };

  application.createScript = (
    fileName, // file name (absolute path)
    callback // function(err, exports)
  ) => {
    const key = application.relative(fileName);
    let exports = application.cache.scripts.get(key);
    if (exports && callback) callback(null, exports);
    else {
      api.fs.readFile(fileName, (err, code) => {
        if (err) {
          application.log.error(impress.CANT_READ_FILE + fileName);
          callback(err);
        } else {
          exports = application.prepareScript(fileName, code);
          callback(null, exports);
        }
      });
    }
  };

  application.require = (
    // Synchronous version of application.createScript
    fileName // file name (absolute path)
    // Return: module exports
  ) => {
    const key = application.relative(fileName);
    let exports = application.cache.scripts.get(key);
    if (!exports) {
      try {
        const code = api.fs.readFileSync(fileName);
        if (!code) application.log.error(impress.CANT_READ_FILE + fileName);
        else exports = application.prepareScript(fileName, code);
      } catch (err) {
        err.stack = err.toString() + ' in ' + fileName;
        application.logException(err);
      }
    }
    return exports;
  };

  function globalRequire(
    // Global require for sandbox
    moduleName // string
  ) {
    let exports;
    if (!moduleName.includes('..')) {
      const path = application.dir + '/node_modules/' + moduleName;
      try {
        exports = require(path);
      } catch (err) {
        application.logException(err);
      }
    } else {
      application.logException(new Error(
        'Access denied. Application can`t require module: ' + moduleName
      ));
    }
    return exports;
  }

  application.createSandbox = (callback) => {
    const sandbox = {
      module: {},
      api: {},
      callInContext: impress.callInContextMethod
    };
    sandbox.global = sandbox;
    sandbox.application = application;
    application.sandbox = api.vm.createContext(sandbox);
    application.getSandboxConfig(() => {
      const globals = (
        application.config.sandbox.global || impress.DEFAULT_SANDBOX
      );
      let i, len, moduleLink, moduleName, msg;
      for (i = 0, len = globals.length; i < len; i++) {
        moduleName = globals[i];
        if (moduleName === 'require') moduleLink = globalRequire;
        else moduleLink = global[moduleName];
        if (moduleLink) {
          if (moduleName in api.registry.deprecated) {
            msg = api.registry.deprecated[moduleName];
            moduleLink = api.registry.deprecate(moduleLink, msg);
          }
          application.sandbox[moduleName] = moduleLink;
        }
      }
      const apis = application.config.sandbox.api || api.registry.defaultNames;
      let j, jlen;
      for (j = 0, jlen = apis.length; j < jlen; j++) {
        moduleName = apis[j];
        moduleLink = api[moduleName];
        if (!moduleLink) moduleLink = api.registry.require(moduleName);
        moduleName = api.common.spinalToCamel(moduleName);
        if (moduleLink) application.sandbox.api[moduleName] = moduleLink;
      }
      callback();
    });
  };

  application.getSandboxConfig = (callback) => {
    if (application === impress) {
      application.config.sandbox = impress.DEFAULT_API;
      callback();
    } else {
      application.loadConfigFile('sandbox.js', () => {
        if (!application.config.sandbox) {
          application.config.sandbox = impress.DEFAULT_API;
        }
        callback();
      });
    }
  };

  application.callInContext = (
    fn // function to be called in application sandbox context
  ) => {
    application.sandbox.__callInContext = fn;
    impress.callInContextScript.runInNewContext(application.sandbox);
    delete application.sandbox.__callInContext;
  };

  application.preloadDirectory = (
    relPath, // relative path from /www
    depth, // recursion depth, 0 - maximum, 1 - one level (no recursion), etc.
    callback // preload finish function(err, directories)
  ) => {
    if (!callback) callback = api.common.emptyness;
    if (depth === undefined) depth = 0;
    const absPath = application.dir + '/www' + relPath;
    api.fs.readdir(absPath, (err, files) => {
      const directories = [];
      if (err) {
        application.log.error(impress.CANT_READ_DIR + absPath);
        callback(err);
      } else if (files.length > 0) {
        api.metasync.each(files, (fileName, cb) => {
          const fileExt = api.common.fileExt(fileName);
          const filePath = api.common.addTrailingSlash(absPath) + fileName;
          api.fs.stat(filePath, (err, stats) => {
            if (!err) {
              if (stats.isDirectory() && (depth === 0 || depth > 1)) {
                directories.push(fileName);
                application.preloadDirectory(
                  api.common.addTrailingSlash(relPath) + fileName,
                  depth - 1, cb
                );
              } else if (fileExt === 'js') {
                application.createScript(filePath, cb);
              } else cb();
            } else cb();
          });
        }, () => callback(null, directories));
        application.cache.watch(relPath);
      } else callback(null, directories);
    });
  };

  application.loadApi = (callback) => {
    const relPath = '/api/';
    const absPath = application.dir + relPath;
    api.fs.readdir(absPath, (err, files) => {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + absPath);
        callback(err);
      } else if (files.length > 0) {
        api.metasync.each(files, (fileName, cb) => {
          const filePath = absPath + fileName;
          api.fs.stat(filePath, (err, stats) => {
            if (!err && stats.isDirectory()) {
              application.loadApiInterface(fileName, filePath, cb);
            } else cb();
          });
        }, callback);
        application.cache.watch(relPath);
      } else callback(null);
    });
  };

  application.loadApiInterface = (interfaceName, path, callback) => {
    const relPath = '/api/' + interfaceName;
    const apiInterface = {};
    application.api[interfaceName] = apiInterface;
    api.fs.readdir(path, (err, files) => {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + relPath);
        callback(err);
      } else if (files.length > 0) {
        api.metasync.each(files, (fileName, cb) => {
          const fileExt = api.common.fileExt(fileName);
          const methodName = fileName.substr(0, fileName.length - 3);
          const filePath = path + '/' + fileName;
          api.fs.stat(filePath, (err, stats) => {
            if (!err && stats.isFile() && fileExt === 'js') {
              application.createScript(filePath, (err, exports) => {
                apiInterface[methodName] = exports;
                cb();
              });
            } else cb();
          });
        }, callback);
        application.cache.watch(relPath);
      } else callback(null);
    });
  };

  application.loadConfig = (callback) => {
    const logDir = application.dir + '/config';
    api.fs.readdir(logDir, (err, files) => {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + logDir);
        callback();
      } else {
        files.sort(api.common.sortCompareConfig);
        api.metasync.filter(files, (file, cb) => {
          const fileExt = api.path.extname(file);
          const fileName = api.path.basename(file, fileExt);
          if (!impress.mode) cb(!fileName.includes('.'));
          else {
            const modeName = api.path.extname(fileName);
            const fName = fileName + '.' + impress.mode + fileExt;
            const noMode = modeName === '' || modeName === '.' + impress.mode;
            cb(!files.includes(fName) && noMode);
          }
        }, (files) => {
          api.metasync.series(files, application.loadConfigFile, () => {
            application.preprocessConfig();
            if (application === impress) impress.nodeId = (
              impress.config.scale.server + 'N' + impress.workerId
            ); else application.nodeId = impress.nodeId;
            application.log.init();
            application.log.open(() => {
              application.start();
              callback();
            });
          });
        });
      }
    });
    application.cache.watch('/config');
  };

  application.loadConfigFile = (file, callback) => {
    const configFile = application.dir + '/config/' + file;
    const configDefinition = (
      application === impress ?
      impress.serverConfigDefinition : impress.applicationConfigDefinition
    );
    let sectionName, validationResult;
    const fileExt = api.path.extname(file);
    const fileName = api.path.basename(file, fileExt);
    if (impress.mode) {
      sectionName = api.path.basename(fileName, '.' + impress.mode);
    } else sectionName = fileName;
    if (fileExt === '.js') {
      if (!application.config[sectionName]) {
        application.createScript(configFile, (err, exports) => {
          application.config[sectionName] = exports;
          // Validate configuration
          if (configDefinition[sectionName]) {
            validationResult = api.definition.validate(
              exports, configDefinition, sectionName, true
            );
            if (process.isMaster) {
              api.definition.printErrors(
                'Error(s) in configuration found:\n'.red.bold +
                'Application: ' + application.name.yellow.bold +
                ' Config file: ' + (sectionName + '.js').yellow.bold,
                validationResult
              );
            }
          }
          callback();
        });
      } else callback();
    } else callback();
  };

  application.preprocessConfig = () => {
    const config = application.config;
    if (Array.isArray(config.hosts)) {
      if (config.hosts.join('').includes('*')) {
        application.hostsRx = api.common.arrayRegExp(config.hosts);
      }
    } else if (application !== impress) {
      application.log.error('Configuration error: empty or wrong hosts.js');
    }

    const servers = config.servers;
    let server, serverName, serviceName, cpus, i, ilen, srv, port;
    config.servers = {};
    for (serverName in servers) {
      server = servers[serverName];
      if (server.ports.length > 1) {
        cpus = api.os.cpus().length;
        server.ports = api.common.sequence(server.ports, cpus);
      }
      for (i = 0, ilen = server.ports.length; i < ilen; i++) {
        port = server.ports[i];
        srv = Object.assign({}, server);
        srv.port = port;
        serviceName = serverName === 'master' ? serverName : serverName + port;
        if (srv.inspect) srv.inspect += i;
        config.servers[serviceName] = srv;
      }
    }

    if (!application.isInitialized && application !== impress) {
      application.isInitialized = true;
      if (config.routes) { // Prepare application routes
        let j, jlen, route, rx;
        const routes = config.routes;
        for (j = 0, jlen = routes.length; j < jlen; j++) {
          route = routes[j];
          rx = !route.escaping ? route.url : ('^' + route.url
            .replace(/(\/|\?|\.)/g, '\\$1')
            .replace(/\(\\\.\*\)/, '(.*)') + '$'
          );
          route.urlRx = new RegExp(rx);
        }
      }
    }
  };

  application.loadPlaces = (callback) => {
    api.metasync.each(impress.application.places, (placeName, cb) => {
      application.loadPlaceScripts(placeName, cb);
    }, callback);
    application.cache.watch('/model');
  };

  application.loadPlaceScripts = (placeName, callback) => {
    const path = application.dir + '/' + placeName;
    api.fs.exists(path, (exists) => {
      if (exists) {
        api.fs.readdir(path, (err, files) => {
          if (err) {
            application.log.error(
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
      } else callback();
    });
  };

  application.processPlaceFile = (placeName, path, file, load, pass) => {
    if (!file.endsWith('.js')) return pass();
    if (placeName === 'setup') {
      if (impress.workerId !== '1') return pass();
      application.setupScriptChanged(path, file, (changed) => {
        if (!changed) pass();
        else load();
      });
    } else load();
  };

  application.setupScriptChanged = (path, file, callback) => {
    const scriptName = api.path.basename(file, '.js');
    const scriptPath = path + '/' + file;
    const doneFilePath = path + '/' + scriptName + '.done';
    api.fs.readFile(doneFilePath, (err, data) => {
      if (err) return callback(true);
      const doneDate = new Date(data.toString());
      api.fs.stat(scriptPath, (err, stat) => {
        callback(doneDate < stat.mtime);
      });
    });
  };

  application.loadPlaceFile = (
    placeName, // place name (subdirectory name in application base directory)
    path, // directory path
    file, // file name in place directory
    callback // after file loaded
  ) => {
    const sectionName = api.path.basename(file, '.js');
    application.createScript(path + '/' + file, (err, exports) => {
      if (!err) {
        if (placeName === 'tasks') {
          application.setTask(sectionName, exports);
        } else if (placeName === 'model') {
          application.model[sectionName] = exports;
        } else if (placeName === 'setup') {
          api.fs.writeFile(
            path + '/' + sectionName + '.done', new Date().toISOString()
          );
        }
      }
      callback();
    });
  };

  application.setTask = (taskName, exports) => {
    application.stopTask(taskName);
    application.tasks[taskName] = exports;
    const task = application.tasks[taskName];
    if (task) {
      task.name = taskName;
      task.success = null;
      task.error = null;
      task.lastStart = null;
      task.lastEnd = null;
      task.executing = false;
      task.active = false;
      task.count = 0;
      application.startTask(taskName);
    }
  };

  application.startTask = (
    taskName // task name in application.tasks hash
  ) => {
    const task = application.tasks[taskName];
    if (task && !task.active) {
      task.active = true;
      task.interval = api.common.duration(task.interval);
      task.timer = api.timers.setInterval(() => {
        if (!task.executing) {
          task.lastStart = Date.now();
          task.executing = true;
          task.run(task, (taskResult) => {
            task.error = taskResult;
            task.success = taskResult === null;
            task.lastEnd = Date.now();
            task.executing = false;
            task.count++;
          });
        }
      }, task.interval);
    }
  };

  application.stopTask = (
    taskName // task name in application.tasks hash
  ) => {
    const task = application.tasks[taskName];
    if (task && task.timer) api.timers.clearInterval(task.timer);
    delete application.tasks[taskName];
  };

  application.stopTasks = () => {
    const tasks = application.tasks;
    const taskNames = Object.keys(tasks);
    taskNames.map(application.stopTask);
  };

  application.dispatch = (
    req, // instance of http.IncomingMessage
    res // instance of http.ServerResponse
  ) => {
    const client = new impress.Client(application, req, res);

    if (application.config.application.slowTime) {
      client.slowTime = application.config.application.slowTime;
    }

    const routes = application.config.routes;
    if (routes) {
      let i, len, route, match;
      for (i = 0, len = routes.length; i < len; i++) {
        route = routes[i];
        match = req.url.match(route.urlRx);
        if (match) {
          return application.dispatchRoute(
            client, route, match, i
          );
        }
      }
    }

    client.static(() => {
      if (impress.HTTP_VERBS.indexOf(client.method) > 0) {
        const contentType = req.headers['content-type'];
        if (contentType && contentType.startsWith('multipart')) {
          const form = new api.multiparty.Form();
          form.parse(req, (err, fields, files) => {
            if (err) client.error(400);
            else {
              client.files = files;
              client.fields = fields;
              Object.assign(client.parameters, client.fields);
              client.dispatch();
            }
          });
        } else {
          req.on('data', chunk => client.chunks.push(chunk));
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
      } else client.dispatch();
    });
    return client;
  };

  application.dispatchRoute = (
    client, // instance of Client
    route, // route name
    match, // Array of URL elements mached route.urlRx
    iRoute // route index in application.config.routes
  ) => {
    client.slowTime = route.slowTime;
    const req = client.req;
    const res = client.res;
    let urlRoute = req.url;
    if (route.rewrite && match.length > 1) {
      urlRoute = route.rewrite.replace(
        impress.ROUTE_NUM_REGEXP,
        (s, key) => (match[key] || '')
      );
    } else urlRoute = route.rewrite;
    req.usedRoutes = req.usedRoutes || [];
    if (route.host) client.proxy(route.host, route.port || 80, urlRoute);
    else if (req.usedRoutes.includes(iRoute)) client.error(508);
    else {
      req.url = urlRoute;
      req.usedRoutes.push(iRoute);
      impress.dispatcher(req, res);
    }
  };

  application.compress = (
    // Refresh static in memory cache with compression and minification
    filePath, // compressing file path
    stats, // instance of fs.Stats
    callback // function(err, data, compressed)
  ) => {
    api.fs.readFile(filePath, (err, data) => {
      if (err) {
        if (callback) callback(err);
      } else {
        const relPath = application.relative(filePath);
        const ext = api.common.fileExt(filePath);
        const lst = application.config.files.preprocess.includes(ext);
        const minifyed = ext === 'js' && filePath.endsWith('.min.js');
        if (lst && !minifyed) {
          const pre = impress.preprocess[ext];
          if (pre) {
            data = pre(data);
            if (data) stats.size = data.length;
            else {
              if (callback) {
                callback(new Error(ext + ' parse/preprocess error'));
              }
              application.cache.static.add(relPath, impress.FILE_PARSE_ERROR);
              return application.cache.watch(api.path.dirname(relPath));
            }
          }
        }
        if (
          application.config.files.gzip &&
          !impress.COMPRESSED_EXT.includes(ext) &&
          stats.size > impress.COMPRESS_ABOVE
        ) {
          api.zlib.gzip(data, (err, data) => {
            if (!err) stats.size = data.length;
            if (callback) callback(err, data, true);
            const cache = { stats, compressed: true, data };
            if (!err) application.cache.static.add(relPath, cache);
          });
        } else {
          if (callback) callback(null, data, false);
          const cache = { stats, compressed: false, data };
          application.cache.static.add(relPath, cache);
        }
        application.cache.watch(api.path.dirname(relPath));
      }
    });
  };

  application.shutdownLongWorkers = () => {
    let workerId;
    for (workerId in application.longWorkers) {
      application.longWorkers[workerId].kill();
    }
  };

  application.handler = (
    // Programmatically create HTTP request handler
    method, // http verb (get, post...)
    path, // path for handler
    handler, // impress functon (2 parameter) or middleware (3 parameter)
    meta // metadata to be set as handler.handler (optional)
  ) => {
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
  //
  impress.HTTP_VERBS.forEach((verb) => {
    application[verb] = (path, handler, meta) => {
      application.handler(verb, path, handler, meta);
    };
  });

};
