'use strict';

// Directories for application
//   .dir        /
//   .appDir:    /app
//   .configDir: /config
//   .tasksDir:  /tasks
//   .initDir:   /init
//   .setupDir:  /setup
//   .modelDir:  /model
//
impress.applicationDirs = [ 'app', 'config', 'tasks', 'init', 'setup', 'model' ];
impress.applicationPlaces = [ 'tasks', 'init', 'setup', 'model' ];

// Mixin application methods to given object
// Application should have:
//   .dir - application root
//
impress.mixinApplication = function(application, callback) {

  application.config = {};
  application.tasks = {};
  application.model = {};
  application.users = {};
  application.sessions = {};
  application.workers = {};
  application.longWorkers = {};
  application.isInitialized = false;

  // Create execution domain
  //
  application.catchException = function(err) {
    if (application.executionDomain.client) {
      application.executionDomain.client.error(500);
      application.executionDomain.client = null;
    }
    application.logException(err);
    callback();
  };
  application.executionDomain = api.domain.create();
  application.executionDomain.on('error', application.catchException);

  // Log application error with stack trace
  //
  application.logException = function(err) {
    var separator = impress.isWin ? '\\' : '/',
        path = __dirname + separator,
        rxPath1 = new RegExp(escapeRegExp(api.path.dirname(__dirname) + separator + 'node_modules'), 'g'),
        rxPath2 = new RegExp(escapeRegExp(path), 'g'),
        rxPath3 = new RegExp(escapeRegExp(process.cwd() + separator + 'node_modules'), 'g'),
        rxPath4 = new RegExp(escapeRegExp(process.cwd()), 'g'),
        stack = err.stack;
    if (!stack) stack = err.toString();
    stack = stack.replace(rxPath1, '').replace(rxPath2, '').replace(rxPath3, '').replace(rxPath4, '').replace(/\n\s{4,}at/g, ';');
    if (application.log && application.log.error) application.log.error(stack);
    else if (impress.log && impress.log.error) impress.log.error(stack);
    else console.log(stack);
  };

  // Define application path property using getter
  //
  function pathGetter(propertyName, dirName) {
    Object.defineProperty(application, propertyName, {
      get: function() {
        return this.dir + '/' + dirName;
      }
    });
  }

  // Defile paths from array impress.applicationDirs
  //
  if (application !== impress) {
    var i, dirName, propertyName;
    for (i = 0; i < impress.applicationDirs.length; i++) {
      dirName = impress.applicationDirs[i];
      propertyName = dirName + 'Dir';
      pathGetter(propertyName, dirName);
    }
  }

  // Compile, execute and save script exports to cache or get exports from cache,
  //   callback(err, key, exports), where exports - function or object exported from script
  //
  application.createScript = function(fileName, callback) {
    var exports = application.cache.scripts[fileName];
    if (exports && callback) callback(null, exports);
    else api.fs.readFile(fileName, function(err, code) {
      if (err) {
        var logger = application.log || impress.log;
        logger.error(impress.CANT_READ_FILE + fileName);
        if (callback) callback();
      } else {
        var scriptName = fileName.replace(application.isMainApplication ? impress.dir : impress.applicationsDir, '');
        try {
          var script = api.vm.createScript(code, scriptName);
          application.sandbox.module = {};
          script.runInNewContext(application.sandbox);
          exports = application.sandbox.module.exports;
          application.sandbox.module = {};
        } catch(err) {
          err.stack = err.toString() + ' in '+scriptName;
          application.logException(err);
        }
        application.cache.scripts[fileName] = exports;
      }
      if (callback) callback(null, exports);
    });
  };

  // Run script in application context
  //
  application.runScript = function(fileName, client, callback) {
    var itemName = api.path.basename(fileName, '.js');
    application.createScript(fileName, function(err, fn) {
      if (err) onError(err); else if (itemName === 'access') {
        client.access = extend(client.access, fn);
        client.calculateAccess();
        callback();
      } else {
        application.executionDomain.client = client;
        application.executionDomain.run(function() {
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
                  else {
                    var headerName;
                    for (headerName in headers) client.res.setHeader(headerName, headers[headerName]);
                  }
                }
                callback();
              });
              // Execute middleware handlers
              else if (fn.length === 3) fn(client.req, client.res, callback);
              else callback();
            } catch(err) {
              application.catchException(err);
            }
          } else callback();
        });
      }
    });
  };

  // Create application sandbox
  //
  application.createSandbox = function(callback) {
    var sandbox = { module:{}, api:{}, callInContext:impress.callInContextMethod };
    sandbox.global = sandbox;
    sandbox.application = application;
    application.sandbox = api.vm.createContext(sandbox);
    application.callInContext(impress.initContext);
    application.loadConfigFile('sandbox.js', function() {
      if (application.config.sandbox) {
        var module, moduleName, moduleAlias, i;
        var globals = application.config.sandbox.global || impress.DEFAULT_SANDBOX_MODULES;
        for (i = 0; i < globals.length; i++) {
          moduleName = globals[i];
          if (moduleName === 'require') module = require;
          else if (moduleName === 'security') module = impress.security;
          else module = global[moduleName];
          if (module) application.sandbox[moduleName] = module;
        }
        var apis = application.config.sandbox.api || [];
        for (i = 0; i < apis.length; i++) {
          moduleAlias = apis[i];
          if (impress.API_ALIASES[moduleAlias]) moduleName = impress.API_ALIASES[moduleAlias];
          else moduleName = moduleAlias;
          module = api[moduleAlias];
          if (!module) module = impress.require(moduleName);
          if (module) application.sandbox.api[moduleAlias] = module;
        }
      }
      callback();
    });
  };

  // Call given function in application sandbox context
  // Context will be single parameter of the call
  //
  application.callInContext = function(fn) {
    application.sandbox.__callInContext = fn;
    impress.callInContextScript.runInNewContext(application.sandbox);
    delete application.sandbox.__callInContext;
  }

  // Preload all handlers in directory
  //   relPath - relative path from /app
  //   depth - recursion depth, 0 - maximum, 1 - one level (no recursion), etc.
  //   callback - preload finish
  //
  application.preloadDirectory = function(relPath, depth, callback) {
    var staticRx = impress.getByPath(application.config, 'files.staticRx');
    if (typeof(depth) === 'undefined') depth = 0;
    var absPath = application.appDir + relPath;
    api.fs.readdir(absPath, function(err, files) {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + absPath);
        if (callback) callback();
      } else if (files.length > 0) {
        api.async.each(files, function(fileName, cb) {
          var fileExt = impress.fileExt(fileName),
              filePath = trailingSlash(absPath) + fileName;
          api.fs.stat(filePath, function(err, stats) {
            if (!err) {
              if (stats.isDirectory() && (depth === 0 || depth > 1)) {
                application.preloadDirectory(trailingSlash(relPath) + fileName, depth - 1, cb);
              } else if (fileExt === 'js') {
                if (staticRx && staticRx.test(filePath)) cb();
                else application.createScript(filePath, cb);
              } else cb();
            } else cb();
          });
        }, function() {
          if (callback) callback();
        });
        impress.watchCache(application, trailingSlash(absPath));
      } else if (callback) callback();
    });
  };

  // Load configuration files
  //
  application.loadConfig = function(callback) {
    api.fs.readdir(application.configDir, function(err, files) {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + application.configDir);
        callback();
      } else {
        files.sort(impress.sortCompareConfig);
        api.async.filterSeries(files, function(file, cb) {
          var fileExt = api.path.extname(file),
              fileName = api.path.basename(file, fileExt);
          if (!impress.mode) cb(!fileName.contains('.'));
          else {
            var modeName = api.path.extname(fileName);
            cb(!inArray(files, fileName + '.' + impress.mode + fileExt) && (modeName === '' || modeName === '.' + impress.mode));
          }
        }, function(files) {
          api.async.eachSeries(files, application.loadConfigFile, function() { callback(); });
        });
      }
    });
    impress.watchCache(application, application.configDir + '/');
  };

  // Load single configuration file
  //
  application.loadConfigFile = function(file, callback) {
    var configFile = application.configDir + '/' + file,
        configDefinition = (application === impress) ? impress.serverConfigDefinition : impress.applicationConfigDefinition,
        sectionName, validationResult,
        fileExt = api.path.extname(file),
        fileName = api.path.basename(file, fileExt);
    if (impress.mode) sectionName = api.path.basename(fileName, '.' + impress.mode);
    else sectionName = fileName;
    if (fileExt === '.js') {
      if (!application.config[sectionName]) {
        application.createScript(configFile, function(err, exports) {
          application.config[sectionName] = exports;
          // Validate configuration
          if (configDefinition[sectionName]) {
            validationResult = api.definition.validate(exports, configDefinition, sectionName, true);
            api.definition.printErrors(
              'Error(s) in configuration found:\n'.red.bold +
              'Application: ' + application.name.yellow.bold + ' Config file: ' + (sectionName + '.js').yellow.bold,
              validationResult
            );
          }
          if (sectionName === 'databases' && global.db) db.openApplicationDatabases(application, callback);
          else callback();
        });
      } else callback();
    } else if (fileExt === '.json') {
      application.config[sectionName] = require(configFile);
      callback();
    } else callback();
  };

  // Preprocess application configuration
  //
  application.preprocessConfig = function() {
    var config = application.config;
    if (config.hosts) application.hostsRx = impress.arrayRegExp(config.hosts);
    else if (application.log && application !== impress) application.log.error('Configuration error: empty or wrong hosts.js');
    if (config.files && config.files.static) config.files.staticRx = impress.arrayRegExp(config.files.static);
    if (!application.isInitialized && application !== impress) {
      application.isInitialized = true;
      var i;
      // Prepare plugins
      if (config.sandbox && config.sandbox.plugins) {
        var pluginName, plugin;
        for (i = 0; i < config.sandbox.plugins.length; i++) {
          pluginName = config.sandbox.plugins[i];
          plugin = impress.getByPath(global, pluginName);
          if (plugin && plugin !== impress && plugin.mixinApplication) plugin.mixinApplication(application);
        }
      }
      // Prepare application routes
      if (config.routes) {
        var route, rx, routes = config.routes;
        for (i = 0; i < routes.length; i++) {
          route = routes[i];
          if (route.escaping === false) rx = route.url;
          else rx = '^' + route.url.replace(/(\/|\?|\.)/g, '\\$1').replace(/\(\\\.\*\)/, '(.*)') + '$';
          route.urlRx = new RegExp(rx);
        }
      }
    }
  };

  // Load placs
  //
  application.loadPlaces = function(callback) {
    api.async.each(impress.applicationPlaces, function(placeName, cb) {
      application.loadPlaceScripts(placeName, cb);
    }, callback);
  };

  // Load single place scripts
  //
  application.loadPlaceScripts = function(placeName, callback) {
    var placeDir = application[placeName + 'Dir'];
    api.fs.exists(placeDir, function(exists) {
      if (exists) {
        api.fs.readdir(placeDir, function(err, files) {
          if (err) {
            application.log.error(impress.CANT_READ_DIR + application.configDir);
            if (callback) callback();
          } else {
            api.async.each(files, function(file, callback) {
              if (file.endsWith('.js')) {
                if (placeName === 'setup') {
                  var sectionName = api.path.basename(file, '.js');
                  if (inArray(files, sectionName + '.done')) return callback();
                }
                application.loadPlaceFile(placeName, placeDir, file, callback);
              } else if (callback) callback();
            }, function(err) {
              if (callback) callback();
            });
          }
        });
        if (!inArray([ 'setup', 'init' ], placeName)) impress.watchCache(application, trailingSlash(placeDir));
      } else if (callback) callback();
    });
  };

  // Load place file
  //
  application.loadPlaceFile = function(placeName, placeDir, file, callback) {
    var sectionName = api.path.basename(file, '.js');
    application.createScript(placeDir + '/' + file, function(err, exports) {
      if (placeName === 'tasks') application.setTask(sectionName, exports);
      else if (placeName === 'model') application.model[sectionName] = exports;
      else if (placeName === 'setup') api.fs.writeFile(placeDir + '/' + sectionName + '.done', new Date().toISOString());
      callback();
    });
  };

  // Start or restart application tasks
  //
  application.setTask = function(taskName, exports) {
    application.stopTask(taskName);
    application.tasks[taskName] = exports;
    var task = application.tasks[taskName];
    if (task) {
      task.name      = taskName;
      task.success   = null;
      task.error     = null;
      task.lastStart = null;
      task.lastEnd   = null;
      task.executing = false;
      task.active    = false;
      task.count     = 0;
      application.startTask(taskName);
    }
  };

  // Start task
  //
  application.startTask = function(taskName) {
    var task = application.tasks[taskName];
    if (task && !task.active) {
      if ((api.cluster.isMaster && task.place === 'master') || (api.cluster.isWorker && task.place === 'worker')) {
        task.active = true;
        task.interval = duration(task.interval);
        task.timer = setInterval(function() {
          if (!task.executing) {
            task.lastStart = new Date();
            task.executing = true;
            task.run(task, function(taskResult) {
              task.error = taskResult;
              task.success = taskResult === null;
              task.lastEnd = new Date();
              task.executing = false;
              task.count++;
            });
          }
        }, task.interval);
      }
    }  
  };

  // Stop task
  //
  application.stopTask = function(taskName) {
    var task = application.tasks[taskName];
    if (task && task.timer) clearInterval(task.timer);
    delete application.tasks[taskName];
  };

  // Stop application tasks
  //
  application.stopTasks = function() {
    var taskName, tasks = application.tasks;
    for (taskName in tasks) application.stopTask(taskName);
  };

  // Create or clear application cache
  //
  application.clearCache = function() {
    application.config = {};
    if (application.cache) {
      var i, watcherPath, watcher;
      for (watcherPath in application.cache.watchers) {
        watcher = application.cache.watchers[watcherPath];
        for (i = 0; i < watcher.timers.length; i++) clearTimeout(watcher.timers[i]);
        watcher.close();
      }
    }
    application.cache = {
      templates: [], // template body cache indexed by file name
      files:     [], // file override/inherited cache indexed by file name
      folders:   [], // folder existence cache indexed by folder name
      scripts:   [], // compiled vm scripts
      watchers:  [], // directory watchers indexed by directory name
      static:    [], // static files cache
      pages:     [], // rendered pages cache
      size:      0   // cache size
    };
  };

  // Purge application cache
  //
  application.purgeCache = function() {
    if (application.cache.size > application.config.files.cacheSize) {
      var name;
      for (name in application.cache.static) {
        if (application.cache.static[name].data) {
          application.cache.size -= application.cache.static[name].data.length;
          delete application.cache.static[name];
          if (application.cache.size < application.config.files.cacheSize) return;
        }
      }
    }
  };

  // Refresh static in memory cache with compression and minification
  //   callback(err, data, compressed)
  //
  application.compress = function(filePath, stats, callback) {
    api.fs.readFile(filePath, function(error, data) {
      if (error) {
        if (callback) callback(err);
      } else {
        var ext = impress.fileExt(filePath),
            pre = impress.preprocess[ext];
        if (pre) {
          data = pre(data);
          if (data) stats.size = data.length;
          else {
            if (callback) callback(new Error(ext + ' parse/preprocess error'));
            application.cache.static[filePath] = impress.FILE_PARSE_ERROR;
            impress.watchCache(application, filePath);
            return;
          }
        }
        if (!inArray(impress.COMPRESSED_EXT, ext) && stats.size > impress.COMPRESS_ABOVE) {
          api.zlib.gzip(data, function(err, data) {
            if (!err) stats.size = data.length;
            if (callback) callback(err, data, true);
            if (!err) application.addToCache(filePath, stats, true, data);
          });
        } else {
          if (callback) callback(null, data, false);
          application.addToCache(filePath, stats, false, data);
        }
        impress.watchCache(application, filePath);
      }
    });
  };

  // Add static to cache
  //
  application.addToCache = function(filePath, stats, compressed, data) {
    if (data) {
      application.cache.static[filePath] = { data:data, stats:stats, compressed:compressed };
      application.cache.size += data.length;
    }
    application.purgeCache();
  };

  // Shutdown application
  //
  application.shutdownLongWorkers = function() {
    var workerId;
    for (workerId in application.longWorkers) application.longWorkers[workerId].kill();
  };

  // Programmatically create handler
  //   method - http verb (get, post...)
  //   path - path for handler
  //   handler - impress 2 parameter functon or 3 parameter middleware
  //   meta - metadata to be set as handler.handler (optional)
  //
  application.handler = function(method, path, handler, meta) {
    var dirPath = application.appDir + trailingSlash(path),
        filePath = dirPath + method + '.js';
    if (meta) handler.meta = meta;
    application.cache.scripts[filePath] = handler;
    application.cache.files[filePath] = filePath;
    application.cache.folders[dirPath] = impress.FILE_EXISTS;
  };

  // Programmatically create handlers for http verbs
  //   application.get(path, handler, meta)
  //   application.post(path, handler, meta)
  //   application.put(path, handler, meta)
  //   application.delete(path, handler, meta)
  //
  impress.HTTP_VEBS.forEach(function(verb) {
    application[verb] = function(path, handler, meta) {
      application.handler(verb, path, handler, meta);
    };
  });

  application.clearCache();
  application.createSandbox(callback);

};
