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
impress.applicationDirs = [ 'app', 'config', 'tasks', 'init', 'setup', 'model', 'lib' ];
impress.applicationPlaces = [ 'tasks', 'init', 'setup', 'model', 'lib' ];

// Mixin application methods to given object
// Application should have:
//   .dir - application root
//
impress.mixinApplication = function(application) {

  // Class factory for this application
  //
  application.createApplicationClass = function(className) {
    var BaseClass = impress[className];
    if (BaseClass) {
      var ChildClass = function() {
        this.constructor.apply(this, arguments);
      };
      application[className] = ChildClass;
      ChildClass.prototype = Object.create(BaseClass.prototype);
      ChildClass.prototype.application = application;
    }
  };

  if (application !== impress) {
    application.createApplicationClass('Client');
    application.createApplicationClass('Session');
    application.createApplicationClass('User');
  }

  application.config = {};
  application.tasks = {};
  application.model = {};
  application.users = {};
  application.sessions = {};
  application.workers = {};
  application.longWorkers = {};
  application.isInitialized = false;
  // Refactor: remove .domain from application
  application.domain = api.domain.create();

  // Create execution domain
  //
  application.catchException = function(err) {
    if (application.domain.client) {
      // Refactor: remove .client from domain
      application.domain.client.error(500, err);
      application.domain.client = null;
    }
    application.logException(err);
  };

  application.domain.on('error', application.catchException);

  // Log application error with stack trace
  //
  application.logException = function(err) {
    var separator = impress.isWin ? '\\' : '/',
        path = __dirname + separator,
        rxPath1 = new RegExp(api.impress.escapeRegExp(api.path.dirname(__dirname) + separator + 'node_modules'), 'g'),
        rxPath2 = new RegExp(api.impress.escapeRegExp(path), 'g'),
        rxPath3 = new RegExp(api.impress.escapeRegExp(process.cwd() + separator + 'node_modules'), 'g'),
        rxPath4 = new RegExp(api.impress.escapeRegExp(process.cwd()), 'g'),
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
    var dirName, propertyName;
    for (var i = 0; i < impress.applicationDirs.length; i++) {
      dirName = impress.applicationDirs[i];
      propertyName = dirName + 'Dir';
      pathGetter(propertyName, dirName);
    }
  }

  // Compile, execute and save script exports to cache or get exports from cache,
  //   callback(err, exports), where exports - function or object exported from script
  //
  application.createScript = function(fileName, callback) {
    var exports = application.cache.scripts[fileName];
    if (exports && callback) callback(null, exports);
    else api.fs.readFile(fileName, function(err, code) {
      if (err) {
        var logger = application.log || impress.log;
        logger.error(impress.CANT_READ_FILE + fileName);
        if (callback) callback(err);
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
          if (callback) callback(err);
          return;
        }
        application.cache.scripts[fileName] = exports;
      }
      if (callback) callback(null, exports);
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
        var module, moduleName, moduleAlias;
        var globals = application.config.sandbox.global || impress.DEFAULT_SANDBOX_MODULES;
        for (var i = 0; i < globals.length; i++) {
          moduleName = globals[i];
          if (moduleName === 'require') module = require;
          else if (moduleName === 'security') module = impress.security;
          else module = global[moduleName];
          if (module) application.sandbox[moduleName] = module;
        }
        var apis = application.config.sandbox.api || [];
        for (var j = 0; j < apis.length; j++) {
          moduleAlias = apis[j];
          if (impress.API_ALIASES[moduleAlias]) moduleName = impress.API_ALIASES[moduleAlias];
          else {
            moduleName = moduleAlias;
            moduleAlias = api.impress.spinalToCamel(moduleAlias);
          }
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
  };

  // Preload all handlers in directory
  //   relPath - relative path from /app
  //   depth - recursion depth, 0 - maximum, 1 - one level (no recursion), etc.
  //   callback - preload finish
  //
  application.preloadDirectory = function(relPath, depth, callback) {
    var staticRx = api.impress.getByPath(application.config, 'files.staticRx');
    if (typeof(depth) === 'undefined') depth = 0;
    var absPath = application.appDir + relPath;
    api.fs.readdir(absPath, function(err, files) {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + absPath);
        if (callback) callback();
      } else if (files.length > 0) {
        api.async.each(files, function(fileName, cb) {
          var fileExt = api.impress.fileExt(fileName),
              filePath = api.impress.trailingSlash(absPath) + fileName;
          api.fs.stat(filePath, function(err, stats) {
            if (!err) {
              if (stats.isDirectory() && (depth === 0 || depth > 1)) {
                application.preloadDirectory(
                  api.impress.trailingSlash(relPath) + fileName, depth - 1, cb
                );
              } else if (fileExt === 'js') {
                if (staticRx && staticRx.test(filePath)) cb();
                else application.createScript(filePath, cb);
              } else cb();
            } else cb();
          });
        }, function() {
          if (callback) callback();
        });
        application.watchCache(api.impress.trailingSlash(absPath));
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
        files.sort(api.impress.sortCompareConfig);
        api.async.filterSeries(files, function(file, cb) {
          var fileExt = api.path.extname(file),
              fileName = api.path.basename(file, fileExt);
          if (!impress.mode) cb(!fileName.contains('.'));
          else {
            var modeName = api.path.extname(fileName);
            cb(
              !inArray(files, fileName + '.' + impress.mode + fileExt) && 
              (modeName === '' || modeName === '.' + impress.mode)
            );
          }
        }, function(files) {
          api.async.eachSeries(files, application.loadConfigFile, function() { callback(); });
        });
      }
    });
    application.watchCache(application.configDir + '/');
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
    if (config.hosts) application.hostsRx = api.impress.arrayRegExp(config.hosts);
    else if (application.log && application !== impress) {
      application.log.error('Configuration error: empty or wrong hosts.js');
    }
    if (config.files && config.files.static) {
      config.files.staticRx = api.impress.arrayRegExp(config.files.static);
    }
    if (!application.isInitialized && application !== impress) {
      application.isInitialized = true;
      // Prepare plugins
      if (config.sandbox && config.sandbox.plugins) {
        var pluginName, plugin;
        for (var i = 0; i < config.sandbox.plugins.length; i++) {
          pluginName = config.sandbox.plugins[i];
          plugin = api.impress.getByPath(global, pluginName);
          if (plugin && plugin !== impress && plugin.mixinApplication) {
            plugin.mixinApplication(application);
          }
        }
      }
      // Prepare application routes
      if (config.routes) {
        var route, rx, routes = config.routes;
        for (var j = 0; j < routes.length; j++) {
          route = routes[j];
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
        if (!inArray([ 'setup', 'init' ], placeName)) {
          application.watchCache(api.impress.trailingSlash(placeDir));
        }
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
        task.interval = api.impress.duration(task.interval);
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
    var tasks = application.tasks;
    for (var taskName in tasks) application.stopTask(taskName);
  };

  // Create or clear application cache
  //
  application.clearCache = function() {
    application.config = {};
    if (application.cache) {
      var watcher;
      if (application.cache.timer) clearTimeout(application.cache.timer);
      for (var watcherPath in application.cache.watchers) {
        watcher = application.cache.watchers[watcherPath];
        watcher.close();
      }
    }
    application.cache = {
      templates: [], // template body cache indexed by file name
      files:     [], // file override/inherited cache indexed by file name
      folders:   [], // folder existence cache indexed by folder name
      scripts:   [], // compiled vm scripts
      watchers:  [], // directory watchers indexed by directory name
      timer:   null, // timer to consolidate watch changes
      updates:   [], // array of changes to update on next application.cache.timer event
      static:    [], // static files cache
      pages:     [], // rendered pages cache
      size:      0   // cache size
    };
  };

  // Purge application cache
  //
  application.purgeCache = function() {
    if (application.cache.size > application.config.files.cacheSize) {
      for (var name in application.cache.static) {
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
        var ext = api.impress.fileExt(filePath),
            pre = impress.preprocess[ext];
        if (pre) {
          data = pre(data);
          if (data) stats.size = data.length;
          else {
            if (callback) callback(new Error(ext + ' parse/preprocess error'));
            application.cache.static[filePath] = impress.FILE_PARSE_ERROR;
            application.watchCache(filePath);
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
        application.watchCache(filePath);
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
    for (var workerId in application.longWorkers) {
      application.longWorkers[workerId].kill();
    }
  };

  // Programmatically create handler
  //   method - http verb (get, post...)
  //   path - path for handler
  //   handler - impress 2 parameter functon or 3 parameter middleware
  //   meta - metadata to be set as handler.handler (optional)
  //
  application.handler = function(method, path, handler, meta) {
    var dirPath = application.appDir + api.impress.trailingSlash(path),
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

  // Update changed file in cache
  //
  application.updateFileCache = function(filePath, stats) {
    api.fs.exists(filePath, function(exists) {
      if (!exists) application.cliearDirectoryCache(filePath);
      else {
        var ext = api.impress.fileExt(filePath);
        api.impress.clearCacheStartingWith(application.cache.pages, filePath);
        if (filePath in application.cache.static) {
          // Replace static files memory cache
          application.compress(filePath, stats);
        } else if (ext === 'js' && (filePath in application.cache.scripts)) {
          // Replace changed js file in cache
          application.cache.scripts[filePath] = null;
          application.createScript(filePath, function(err, exports) {
            application.cache.scripts[filePath] = exports;
            var sectionName = api.path.basename(filePath, '.js');
            if (filePath.startsWith(application.configDir)) {
              // Reload config
              application.config[sectionName] = exports;
              application.preprocessConfig();
            } else if (filePath.startsWith(application.tasksDir)) {
              // Reload task
              application.setTask(sectionName, exports);
            }
          });
        } else if (ext === 'template') {
          // Replace changed template file in cache
          delete application.cache.templates[filePath];
          delete application.cache.files[filePath];
          api.fs.readFile(filePath, 'utf8', function(err, tpl) {
            if (!err) {
              if (!tpl) tpl = impress.FILE_IS_EMPTY;
              else tpl = api.impress.removeBOM(tpl);
              application.cache.templates[filePath] = tpl;
            }
          });
        }
      }
    });
  };

  // Clear cache for all changed folders (created or deleted files)
  //
  application.cliearDirectoryCache = function(filePath) {
    api.impress.clearCacheStartingWith(application.cache.static, filePath);
    api.impress.clearCacheStartingWith(application.cache.folders, filePath);
    api.impress.clearCacheStartingWith(application.cache.pages, filePath);
    api.impress.clearCacheStartingWith(application.cache.files, filePath, function(used) {
      var ext = api.impress.fileExt(used);
      if (ext === 'js' && (used in application.cache.scripts)) {
        delete application.cache.scripts[used];
      } else if (ext === 'template' && (used in application.cache.templates)) {
        delete application.cache.templates[used];
      }
    });
  };

  // Update watched cache: process application.cache.updates array
  //
  application.updateCache = function() {
    var updates = application.cache.updates,
        files = {};
    api.async.each(updates, function(filePath, callback) {
      api.fs.exists(filePath, function(exists) {
        if (exists) {
          api.fs.stat(filePath, function(err, stats) {
            if (err) return callback();
            if (stats.isFile()) files[filePath] = stats;
            else {
              // Refresh all cached files in directory
              for (var key in application.cache.files) {
                if (key !== filePath && key.startsWith(filePath) && !files[key]) {
                  files[key] = stats;
                }
              }
            }
            callback();
          });
        } else {
          // Remove from cache
          application.cliearDirectoryCache(filePath);
          callback();
        }
      });
    }, function() {
      var stats;
      for (var filePath in files) {
        stats = files[filePath];
        application.updateFileCache(filePath, stats);
      }
    });
    application.cache.timer = null;
    application.cache.updates = [];
  };
  
  // Cache watchers
  //   filePath - absolute path to file or directory to watch
  //
  application.watchCache = function(filePath) {
    var watchInterval = api.impress.getByPath(impress.config, 'scale.watchInterval') || 2000,
        watcher, path = filePath;
    path = api.impress.stripTrailingSlash(api.path.dirname(path));
    if (application) {
      watcher = application.cache.watchers[path];
      if (!watcher) {
        api.fs.exists(path, function(exists) {
          if (exists) {
            watcher = api.fs.watch(path, function(event, fileName) {
              var filePath, watcher;
              if (fileName) filePath = path + '/' + api.impress.stripTrailingSlash(fileName);
              else filePath = path;
              watcher = application.cache.watchers[path];
              if (application.cache.timer) clearTimeout(application.cache.timer);
              if (application.cache.updates.indexOf(filePath) === -1) {
                application.cache.updates.push(filePath);
              }
              application.cache.timer = setTimeout(application.updateCache, watchInterval);
            });
            watcher.on('error', function() { watcher.close(); });
            application.cache.watchers[path] = watcher;
          }
        });
      }
    }
  };

  application.clearCache();

};
