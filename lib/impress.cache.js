'use strict';

// Impress Application Full Memory Cache

// This plugin should be mixed to impress application
//
impress.cache.mixImpress = true;

// Mixin application methods to given object
// Application should have:
//   .dir - application root
//
impress.cache.mixin = function(application) {

  // Init application cache
  //
  application.cache.init = function() {
    var cache = application.cache;
    cache.templates = []; // template body cache indexed by file name
    cache.files = [];     // file override/inherited cache indexed by file name
    cache.folders = [];   // folder existence cache indexed by folder name
    cache.scripts = [];   // compiled vm scripts
    cache.watchers = [];  // directory watchers indexed by directory name
    cache.timer = null;   // timer to consolidate watch changes
    cache.updates = [];   // array of changes to update on next application.cache.timer event
    cache.static = [];    // static files cache
    cache.pages = [];     // rendered pages cache
    cache.size = 0;       // cache size
  };

  application.cache.init();

  // Clear application cache
  //
  application.cache.clear = function() {
    application.config = {};
    if (application.cache) {
      var watcher;
      if (application.cache.timer) api.timers.clearTimeout(application.cache.timer);
      for (var watcherPath in application.cache.watchers) {
        watcher = application.cache.watchers[watcherPath];
        watcher.close();
      }
    }
    application.cache.init();
  };

  // Purge application cache
  //
  application.cache.purge = function() {
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

  // Add static to cache
  //   relPath - file path relative to application base directory
  //   stats - instance of fs.Stats
  //   compressed - compression boolean flag
  //   data - buffer
  //   cache - structure { stats, compressed, data }
  //
  application.cache.add = function(relPath, cache) {
    if (cache.data) {
      application.cache.static[relPath] = cache;
      application.cache.size += cache.data.length;
    }
    application.cache.purge();
  };

  // Update changed file in cache
  //   filePath - file path relative to application base directory
  //   stats - instance of fs.Stats
  //
  application.updateFileCache = function(filePath, stats) {
    api.fs.exists(filePath, function(exists) {
      if (!exists) application.cliearDirectoryCache(filePath);
      else {
        var ext = api.common.fileExt(filePath),
            relPath = application.relative(filePath);
        api.impress.clearCacheStartingWith(application.cache.pages, relPath);
        if (relPath in application.cache.static) {
          // Replace static files memory cache
          application.compress(filePath, stats);
        } else if (ext === 'js') {
          // Replace changed js file in cache or add it to cache
          // to be removed: if (relPath in application.cache.scripts)
          application.cache.scripts[relPath] = null;
          application.createScript(filePath, function(err, exports) {
            application.cache.scripts[relPath] = exports;
            var sectionName = api.path.basename(filePath, '.js');
            if (api.common.startsWith(filePath, application.dir + '/model')) {
              // Load models
            } else if (api.common.startsWith(filePath, application.dir + '/api')) {
              var parsedPath = relPath.split('/'),
                  interfaceName = parsedPath[2],
                  methodName = parsedPath[3];
              methodName = methodName.substr(0, methodName.length - 3);
              var apiInterface = application.api[interfaceName] || {};
              apiInterface[methodName] = exports;
            } else if (api.common.startsWith(filePath, application.dir + '/config')) {
              // Reload config
              application.config[sectionName] = exports;
              application.preprocessConfig();
            } else if (api.common.startsWith(filePath, application.dir + '/tasks')) {
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
      var ext = api.common.fileExt(used);
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
    api.common.each(updates, function(relPath, cb) {
      var filePath = application.dir + relPath;
      api.fs.exists(filePath, function(exists) {
        if (exists) {
          api.fs.stat(filePath, function(err, stats) {
            if (err) return cb();
            if (stats.isFile()) files[filePath] = stats;
            else {
              // Refresh all cached files in directory
              for (var key in application.cache.files) {
                if (key !== filePath && api.common.startsWith(key, filePath) && !files[key]) {
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
  //   relPath - relative path to file or directory to watch
  //
  application.cache.watch = function(relPath) {
    var filePath = application.dir + relPath,
        watchInterval = api.common.getByPath(impress.config, 'scale.watchInterval') || 2000,
        watcher, path = filePath;
    if (application) {
      watcher = application.cache.watchers[relPath];
      if (!watcher) {
        api.fs.exists(path, function(exists) {
          if (exists) {
            watcher = api.fs.watch(path, function(event, fileName) {
              var filePath, relPath;
              if (fileName) filePath = path + '/' + fileName;
              else filePath = path;
              relPath = application.relative(filePath);
              if (application.cache.timer) {
                api.timers.clearTimeout(application.cache.timer);
              }
              if (application.cache.updates.indexOf(relPath) === -1) {
                application.cache.updates.push(relPath);
              }
              application.cache.timer = api.timers.setTimeout(application.updateCache, watchInterval);
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

};
