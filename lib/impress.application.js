'use strict';

// Application interface for Impress Application Server
//

// Directories for application
//
impress.applicationDirs = ['server', 'static', 'config', 'tasks', 'init', 'setup', 'model', 'lib', 'files', 'templates'];
impress.applicationPlaces = ['tasks', 'init', 'setup', 'model', 'lib'];
impress.defaultTemplates = ['error', 'index', 'introspection'];

// Mixin application methods to given object
// Application should have:
//   .dir - application root
//
impress.mixinApplication = function(application) {

  application.isInitialized = false;
  application.backend = api.impress.eventEmitter();
  application.frontend = api.impress.eventEmitter();
  application.isMaster = api.cluster.isMaster;
  application.isWorker = api.cluster.isWorker;

  // Initialize properties after config loaded
  //
  application.on('start', function() {
    application.nodeId = impress.nodeId;
    application.clusterId = impress.config.scale.cluster;
    application.scaleStrategy = impress.config.scale.strategy;
    application.cloudInstance = impress.config.scale.instance;
  });

  // Class factory for this application
  //
  application.createApplicationClass = function(className) {
    var BaseClass = impress[className];
    if (BaseClass) {
      var ChildClass = function() {
        this.constructor.super_.apply(this, arguments);
      };
      api.util.inherits(ChildClass, BaseClass);
      application[className] = ChildClass;
      ChildClass.prototype.application = application;
    }
  };

  application.config = {}; // key is file name, value is object, exported from file
  application.tasks = {}; // key is task name, value is Function with parameters
  application.model = {}; // key is model name, value is object exported from model definition file
  application.users = {}; // key is login, value is instance of User class
  application.sessions = {}; // key is sid, value is instance of Session class
  application.channels = {};
  application.workers = {};
  application.longWorkers = {};

  if (application !== impress) {
    application.createApplicationClass('Client');
    impress.waf.addApplication(application);
  }

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
    api.impress.logException(err, application);
  };

  // Check system templates
  //
  function checkTemplate(templateName, templatePath) {
    api.fs.exists(templatePath, function(exists) {
      if (exists) application.systemTemplates[templateName] = templatePath;
    });
  }

  application.systemTemplates = {};
  var templateName, templatePath;
  for (var j = 0, jlen = impress.defaultTemplates.length; j < jlen; j++) {
    templateName = impress.defaultTemplates[j];
    templatePath = application.dir + '/templates/' + templateName + '.template';
    application.systemTemplates[templateName] = impress.moduleDir + '/templates/' + templateName + '.template';
    checkTemplate(templateName, templatePath);
  }

  // Convert absolute path to relative
  //
  application.relative = function(path) {
    return path.substr(application.dir.length);
  };

  // Compile, execute and save script exports to cache or get exports from cache,
  //   fileName - file name (absolute path)
  //   code - JavaScript code
  //   return - exported function or object exported from script
  //
  application.prepareScript = function(fileName, code) {
    var exports;
    try {
      var fn = application.relative(fileName),
          scriptName = fileName.replace(application.isMainApplication ? impress.dir : impress.applicationsDir, ''),
          script = api.vm.createScript(code, scriptName);
      application.sandbox.module = {};
      application.sandbox['__filename'] = fn;
      application.sandbox['__dirname'] = api.path.dirname(fn);
      script.runInNewContext(application.sandbox);
      exports = application.sandbox.module.exports;
      application.sandbox.module = {};
      delete application.sandbox['__filename'];
      delete application.sandbox['__dirname']; 
      application.cache.scripts[application.relative(fileName)] = exports;
      return exports;
    } catch(err) {
      err.stack = err.toString() + ' in ' + scriptName;
      application.logException(err);
      return null;
    }
  };

  // Compile, execute and save script exports to cache or get exports from cache,
  //   fileName - file name (absolute path)
  //   callback(err, exports), where exports - function or object exported from script
  //
  application.createScript = function(fileName, callback) {
    var exports = application.cache.scripts[application.relative(fileName)];
    if (exports && callback) callback(null, exports);
    else api.fs.readFile(fileName, function(err, code) {
      if (err) {
        application.log.error(impress.CANT_READ_FILE + fileName);
        callback(err);
      } else {
        exports = application.prepareScript(fileName, code);
        if (exports) callback(null, exports);
        else callback(new Error('Error loading script: ' + fileName));
      }
    });
  };

  // Synchronous version of application.createScript
  //   fileName - file name (absolute path)
  //   return module exports
  //
  application.require = application.require || function(fileName) {
    var exports = application.cache.scripts[application.relative(fileName)];
    if (!exports) {
      try {
        var code = api.fs.readFileSync(fileName);
        if (!code) application.log.error(impress.CANT_READ_FILE + fileName);
        else exports = application.prepareScript(fileName, code);
      } catch(err) {
        err.stack = err.toString() + ' in ' + fileName;
        application.logException(err);
      }
    }
    return exports;
  };

  // Global require for sandbox
  //
  function gobalRequire(moduleName) {
    var exports;
    if (moduleName.indexOf('..') === -1) {
      var path = application.dir + '/node_modules/' + moduleName;
      try {
        exports = require(path);
      } catch(err) {
        application.logException(err);
      }
    } else application.logException(new Error('Access denied. Application can`t require module: ' + moduleName));
    return exports;
  }

  // Create application sandbox
  //
  application.createSandbox = function(callback) {
    var sandbox = { module: {}, api: {}, callInContext: api.impress.callInContextMethod };
    sandbox.global = sandbox;
    sandbox.application = application;
    application.sandbox = api.vm.createContext(sandbox);
    application.loadConfigFile('sandbox.js', function() {
      if (application.config.sandbox) {
        var moduleLink, moduleName,
            globals = application.config.sandbox.global || impress.DEFAULT_SANDBOX;
        for (var i = 0, len = globals.length; i < len; i++) {
          moduleName = globals[i];
          if (moduleName === 'require') moduleLink = gobalRequire;
          else moduleLink = global[moduleName];
          if (moduleLink) application.sandbox[moduleName] = moduleLink;
        }
        var apis = application.config.sandbox.api || api.registry.defaultNames;
        for (var j = 0, jlen = apis.length; j < jlen; j++) {
          moduleName = apis[j];
          moduleLink = api[moduleName];
          if (!moduleLink) moduleLink = api.impress.require(moduleName);
          if (moduleLink) application.sandbox.api[moduleName] = moduleLink;
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
    api.impress.callInContextScript.runInNewContext(application.sandbox);
    delete application.sandbox.__callInContext;
  };

  // Preload all handlers in directory
  //   relPath - relative path from /server
  //   depth - recursion depth, 0 - maximum, 1 - one level (no recursion), etc.
  //   callback(err, directories) - preload finish
  //
  application.preloadDirectory = function(relPath, depth, callback) {
    if (!callback) callback = api.impress.emptyness;
    if (depth === undefined) depth = 0;
    var absPath = application.dir + '/server' + relPath;
    api.fs.readdir(absPath, function(err, files) {
      var directories = [];
      if (err) {
        application.log.error(impress.CANT_READ_DIR + absPath);
        callback(err);
      } else if (files.length > 0) {
        api.async.each(files, function(fileName, cb) {
          var fileExt = api.impress.fileExt(fileName),
              filePath = api.impress.addTrailingSlash(absPath) + fileName;
          api.fs.stat(filePath, function(err, stats) {
            if (!err) {
              if (stats.isDirectory() && (depth === 0 || depth > 1)) {
                directories.push(fileName);
                application.preloadDirectory(
                  api.impress.addTrailingSlash(relPath) + fileName, depth - 1, cb
                );
              } else if (fileExt === 'js') application.createScript(filePath, cb);
              else cb();
            } else cb();
          });
        }, function() {
          callback(null, directories);
        });
        application.watchCache(relPath);
      } else callback(null, directories);
    });
  };

  // Load configuration files
  //
  application.loadConfig = function(callback) {
    api.fs.readdir(application.dir + '/config', function(err, files) {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + application.dir + '/config');
        callback();
      } else {
        files.sort(api.impress.sortCompareConfig);
        api.async.filterSeries(files, function(file, cb) {
          var fileExt = api.path.extname(file),
              fileName = api.path.basename(file, fileExt);
          if (!impress.mode) cb(!api.impress.contains(fileName, '.'));
          else {
            var modeName = api.path.extname(fileName);
            cb(
              !api.impress.inArray(files, fileName + '.' + impress.mode + fileExt) && 
              (modeName === '' || modeName === '.' + impress.mode)
            );
          }
        }, function(files) {
          api.async.eachSeries(files, application.loadConfigFile, function() {
            callback();
          });
        });
      }
    });
    application.watchCache('/config');
  };

  // Load single configuration file
  //
  application.loadConfigFile = function(file, callback) {
    var configFile = application.dir + '/config/' + file,
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
            if (api.cluster.isMaster) api.definition.printErrors(
              'Error(s) in configuration found:\n'.red.bold +
              'Application: ' + application.name.yellow.bold + ' Config file: ' + (sectionName + '.js').yellow.bold,
              validationResult
            );
          }
          callback();
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
    else if (application !== impress) application.log.error('Configuration error: empty or wrong hosts.js');
    if (!application.isInitialized && application !== impress) {
      application.isInitialized = true;
      // Prepare application routes
      if (config.routes) {
        var route, rx, routes = config.routes;
        for (var j = 0, jlen = routes.length; j < jlen; j++) {
          route = routes[j];
          if (route.escaping === false) rx = route.url;
          else rx = '^' + route.url.replace(/(\/|\?|\.)/g, '\\$1').replace(/\(\\\.\*\)/, '(.*)') + '$';
          route.urlRx = new RegExp(rx);
        }
      }
    }
  };

  // Load application places
  //
  application.loadPlaces = function(callback) {
    api.async.each(impress.applicationPlaces, function(placeName, cb) {
      application.loadPlaceScripts(placeName, cb);
    }, callback);
    application.watchCache('/model');
  };

  // Load single place scripts
  //
  application.loadPlaceScripts = function(placeName, callback) {
    var placeDir = application.dir + '/' + placeName;
    api.fs.exists(placeDir, function(exists) {
      if (exists) {
        api.fs.readdir(placeDir, function(err, files) {
          if (err) {
            application.log.error(impress.CANT_READ_DIR + application.dir + '/config');
            callback();
          } else {
            api.async.each(files, function(file, cb) {
              if (api.impress.endsWith(file, '.js')) {
                if (placeName === 'setup') {
                  var sectionName = api.path.basename(file, '.js');
                  if (api.impress.inArray(files, sectionName + '.done')) return cb();
                }
                application.loadPlaceFile(placeName, placeDir, file, cb);
              } else cb();
            }, function(/*err*/) {
              callback();
            });
          }
        });
        if (placeName !== 'setup') application.watchCache('/' + placeName);
      } else callback();
    });
  };

  // Load place file
  //   placeName - place name (subdirectory name in application base directory)
  //   placeDir - directory path
  //   file - file name in place directory
  //   callback - call after file loaded
  //
  application.loadPlaceFile = function(placeName, placeDir, file, callback) {
    var sectionName = api.path.basename(file, '.js');
    application.createScript(placeDir + '/' + file, function(err, exports) {
      if (!err) {
        if (placeName === 'tasks') application.setTask(sectionName, exports);
        else if (placeName === 'model') application.model[sectionName] = exports;
        else if (placeName === 'setup') api.fs.writeFile(placeDir + '/' + sectionName + '.done', new Date().toISOString());
      }
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

  // Start task
  //   taskName - task name in application.tasks hash
  //
  application.startTask = function(taskName) {
    var task = application.tasks[taskName];
    if (task && !task.active) {
      if ((api.cluster.isMaster && task.place === 'master') || (api.cluster.isWorker && task.place === 'worker')) {
        task.active = true;
        task.interval = api.impress.duration(task.interval);
        task.timer = setInterval(function() {
          if (!task.executing) {
            task.lastStart = Date.now();
            task.executing = true;
            task.run(task, function(taskResult) {
              task.error = taskResult;
              task.success = taskResult === null;
              task.lastEnd = Date.now();
              task.executing = false;
              task.count++;
            });
          }
        }, task.interval);
      }
    }  
  };

  // Stop task
  //   taskName - task name in application.tasks hash
  //
  application.stopTask = function(taskName) {
    var task = application.tasks[taskName];
    if (task && task.timer) clearInterval(task.timer);
    delete application.tasks[taskName];
  };

  // Stop application tasks
  //
  application.stopTasks = function() {
    var tasks = application.tasks,
        taskNames = Object.keys(tasks);
    taskNames.map(application.stopTask);
  };

  // Dispatch requests
  //   req - request is an instance of http.IncomingMessage
  //   res - rsponse is an instance of http.ServerResponse
  //
  application.dispatch = function(req, res) {
    var route, match, form,
        client = new application.Client(application, req, res);

    if (application.config.application.slowTime) client.slowTime = application.config.application.slowTime;

    if (application.config.routes) {
      for (var iRoute = 0, len = application.config.routes.length; iRoute < len; iRoute++) {
        route = application.config.routes[iRoute];
        match = req.url.match(route.urlRx);
        if (match) return application.dispatchRoute(client, route, match, req, res, iRoute);
      }
    }

    client.static(function() {
      if (impress.HTTP_VEBS.indexOf(client.method) > 0) {
        var contentType = req.headers['content-type'];
        if (contentType && api.impress.startsWith(contentType, 'multipart')) {
          form = new api.multiparty.Form();
          form.parse(req, function(err, fields, files) {
            if (err) client.error(400);
            else {
              client.files = files;
              client.fields = fields;
              api.impress.extend(client.parameters, client.fields);
              client.dispatch();
            }
          });
        } else {
          req.on('data', function(chunk) {
            client.chunks.push(chunk);
          });
          req.on('end', function() {
            client.data = Buffer.concat(client.chunks).toString();
            if (contentType && api.impress.startsWith(contentType, 'application/json')) {
              client.fields = JSON.parse(client.data);
            } else client.fields = api.querystring.parse(client.data);
            api.impress.extend(client.parameters, client.fields);
            client.dispatch();
          });
        }
      } else client.dispatch();
    });
    return client;
  };
  
  // Dispatch route
  //   client - instance of Client
  //   route - route name
  //   match - Array of URL elements mached route.urlRx
  //   req - request is an instance of http.IncomingMessage
  //   res - rsponse is an instance of http.ServerResponse
  //   iRoute - route index in application.config.routes
  //
  application.dispatchRoute = function(client, route, match, req, res, iRoute) {
    if (route.slowTime) client.slowTime = route.slowTime;
    var urlRoute = req.url;
    if (route.rewrite && match.length > 1) {
      urlRoute = route.rewrite.replace(impress.ROUTE_NUM_REGEXP, function(s, key) {
        return match[key] || '';
      });
    } else urlRoute = route.rewrite;
    req.usedRoutes = req.usedRoutes || [];
    if (route.host) client.proxy(route.host, route.port || 80, urlRoute);
    else if (api.impress.inArray(req.usedRoutes, iRoute)) client.error(508);
    else {
      req.url = urlRoute;
      req.usedRoutes.push(iRoute);
      impress.dispatcher(req, res);
    }
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
  //   filePath - compressing file path
  //   stats - instance of fs.Stats
  //   callback - function(err, data, compressed)
  //
  application.compress = function(filePath, stats, callback) {
    api.fs.readFile(filePath, function(err, data) {
      if (err) {
        if (callback) callback(err);
      } else {
        var relPath = application.relative(filePath),
            ext = api.impress.fileExt(filePath),
            lst = api.impress.inArray(application.config.files.preprocess, ext),
            minifyed = (ext === 'js') && api.impress.endsWith(filePath, '.min.js');
        if (lst && !minifyed) {
          var pre = impress.preprocess[ext];
          if (pre) {
            data = pre(data);
            if (data) stats.size = data.length;
            else {
              if (callback) callback(new Error(ext + ' parse/preprocess error'));
              application.cache.static[relPath] = impress.FILE_PARSE_ERROR;
              application.watchCache(api.path.dirname(relPath));
              return;
            }
          }
        }
        if (
          application.config.files.gzip &&
          !api.impress.inArray(impress.COMPRESSED_EXT, ext) &&
          stats.size > impress.COMPRESS_ABOVE
        ) {
          api.zlib.gzip(data, function(err, data) {
            if (!err) stats.size = data.length;
            if (callback) callback(err, data, true);
            if (!err) application.addToCache(relPath, stats, true, data);
          });
        } else {
          if (callback) callback(null, data, false);
          application.addToCache(relPath, stats, false, data);
        }
        application.watchCache(api.path.dirname(relPath));
      }
    });
  };

  // Add static to cache
  //   relPath - file path relative to application base directory
  //   stats - instance of fs.Stats
  //   compressed - compression boolean flag
  //   data - buffer
  //
  application.addToCache = function(relPath, stats, compressed, data) {
    if (data) {
      application.cache.static[relPath] = { data: data, stats: stats, compressed: compressed };
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
    var dirPath = application.dir + '/server' + api.impress.addTrailingSlash(path),
        filePath = dirPath + method + '.js',
        relPath = application.relative(filePath);
    if (meta) handler.meta = meta;
    application.cache.scripts[relPath] = handler;
    application.cache.files[relPath] = impress.FILE_EXISTS;
    application.cache.folders[application.relative(relPath)] = impress.DIR_EXISTS;
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
  //   filePath - file path relative to application base directory
  //   stats - instance of fs.Stats
  //
  application.updateFileCache = function(filePath, stats) {
    api.fs.exists(filePath, function(exists) {
      if (!exists) application.cliearDirectoryCache(filePath);
      else {
        var ext = api.impress.fileExt(filePath),
            relPath = application.relative(filePath);
        api.impress.clearCacheStartingWith(application.cache.pages, relPath);
        if (relPath in application.cache.static) {
          // Replace static files memory cache
          application.compress(filePath, stats);
        } else if (ext === 'js' && (relPath in application.cache.scripts)) {
          // Replace changed js file in cache
          application.cache.scripts[relPath] = null;
          application.createScript(filePath, function(err, exports) {
            application.cache.scripts[relPath] = exports;
            var sectionName = api.path.basename(filePath, '.js');
            if (api.impress.startsWith(filePath, application.dir + '/model')) {
              //
            } else if (api.impress.startsWith(filePath, application.dir + '/config')) {
              // Reload config
              application.config[sectionName] = exports;
              application.preprocessConfig();
            } else if (api.impress.startsWith(filePath, application.dir + '/tasks')) {
              // Reload task
              application.setTask(sectionName, exports);
            }
          });
        } else if (ext === 'template') {
          // Replace changed template file in cache
          delete application.cache.templates[relPath];
          delete application.cache.files[relPath];
          api.fs.readFile(filePath, 'utf8', function(err, tpl) {
            if (!err) {
              if (!tpl) tpl = impress.FILE_IS_EMPTY;
              else tpl = api.impress.removeBOM(tpl);
              application.cache.templates[relPath] = tpl;
            }
          });
        }
      }
    });
  };

  // Clear cache for all changed folders (created or deleted files)
  //   filePath - file path relative to application base directory
  //
  application.cliearDirectoryCache = function(filePath) {
    var relPath = application.relative(filePath);
    api.impress.clearCacheStartingWith(application.cache.static, relPath);
    api.impress.clearCacheStartingWith(application.cache.folders, relPath);
    api.impress.clearCacheStartingWith(application.cache.pages, relPath);
    api.impress.clearCacheStartingWith(application.cache.files, relPath, function(used) {
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
    application.emit('change');
    var updates = application.cache.updates,
        files = {};
    api.async.each(updates, function(relPath, cb) {
      var filePath = application.dir + relPath;
      api.fs.exists(filePath, function(exists) {
        if (exists) {
          api.fs.stat(filePath, function(err, stats) {
            if (err) return cb();
            if (stats.isFile()) files[filePath] = stats;
            else {
              // Refresh all cached files in directory
              for (var key in application.cache.files) {
                if (key !== filePath && api.impress.startsWith(key, filePath) && !files[key]) {
                  files[key] = stats;
                }
              }
            }
            cb();
          });
        } else {
          // Remove from cache
          application.cliearDirectoryCache(filePath);
          cb();
        }
      });
    }, function() {
      var stats;
      for (var filePath in files) {
        stats = files[filePath];
        application.updateFileCache(filePath, stats);
      }
      application.emit('changed');
    });
    application.cache.timer = null;
    application.cache.updates = [];
  };
  
  // Cache watchers
  //   filePath - absolute path to file or directory to watch
  //
  application.watchCache = function(relPath) {
    var filePath = application.dir + relPath,
        watchInterval = api.impress.getByPath(impress.config, 'scale.watchInterval') || 2000,
        watcher, path = filePath;
    if (application) {
      watcher = application.cache.watchers[relPath];
      if (!watcher) {
        api.fs.exists(path, function(exists) {
          if (exists) {
            watcher = api.fs.watch(path, function(event, fileName) {
              var filePath, relPath, watcher;
              if (fileName) filePath = path + '/' + fileName;
              else filePath = path;
              relPath = application.relative(filePath);
              watcher = application.cache.watchers[relPath];
              if (application.cache.timer) clearTimeout(application.cache.timer);
              if (application.cache.updates.indexOf(relPath) === -1) {
                application.cache.updates.push(relPath);
              }
              application.cache.timer = setTimeout(application.updateCache, watchInterval);
            });
            watcher.on('error', function() {
              watcher.close();
            });
            application.cache.watchers[relPath] = watcher;
          }
        });
      }
    }
  };

  application.clearCache();

};
