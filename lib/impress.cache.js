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

  var cache = application.cache;

  // Init application cache
  //
  cache.init = function() {
    cache.templates = []; // template body cache indexed by file name
    cache.files = [];     // file override/inherited cache indexed by file name
    cache.folders = [];   // folder existence cache indexed by folder name
    cache.scripts = [];   // compiled vm scripts
    cache.watchers = [];  // directory watchers indexed by directory name
    cache.timer = null;   // timer to consolidate watch changes
    cache.updates = [];   // array of changes to update on next timer event
    cache.static = [];    // static files cache
    cache.pages = [];     // rendered pages cache
    cache.size = 0;       // cache size
  };

  cache.init();

  // Clear application cache
  //
  cache.clear = function() {
    application.config = {};
    if (cache) {
      var watcher;
      if (cache.timer) {
        api.timers.clearTimeout(cache.timer);
      }
      for (var watcherPath in cache.watchers) {
        watcher = cache.watchers[watcherPath];
        watcher.close();
      }
    }
    cache.init();
  };

  // Purge application cache
  //
  cache.purge = function() {
    if (cache.size > application.config.files.cacheSize) {
      for (var name in cache.static) {
        if (cache.static[name].data) {
          cache.size -= cache.static[name].data.length;
          delete cache.static[name];
          if (cache.size < application.config.files.cacheSize) return;
        }
      }
    }
  };

  // Add static to cache
  //   relPath - file path relative to application base directory
  //   item - structure { stats, compressed, data }
  //    stats - instance of fs.Stats
  //    compressed - compression boolean flag
  //    data - Buffer
  //
  cache.add = function(relPath, item) {
    if (item.data) {
      cache.static[relPath] = item;
      cache.size += item.data.length;
    }
    cache.purge();
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
        api.impress.clearCacheStartingWith(cache.pages, relPath);
        if (relPath in cache.static) {
          // Replace static files memory cache
          application.compress(filePath, stats);
        } else if (ext === 'js') {
          // Replace changed js file in cache or add it to cache
          // to be removed: if (relPath in application.cache.scripts)
          cache.scripts[relPath] = null;
          application.createScript(filePath, function(err, exports) {
            cache.scripts[relPath] = exports;
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
          delete cache.templates[relPath];
          delete cache.files[relPath];
          api.fs.readFile(filePath, 'utf8', function(err, tpl) {
            if (!err) {
              if (!tpl) tpl = impress.FILE_IS_EMPTY;
              else tpl = api.impress.removeBOM(tpl);
              cache.templates[relPath] = tpl;
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
    api.impress.clearCacheStartingWith(cache.static, relPath);
    api.impress.clearCacheStartingWith(cache.folders, relPath);
    api.impress.clearCacheStartingWith(cache.pages, relPath);
    api.impress.clearCacheStartingWith(cache.files, relPath, function(used) {
      var ext = api.common.fileExt(used);
      if (ext === 'js' && (used in cache.scripts)) {
        delete cache.scripts[used];
      } else if (ext === 'template' && (used in cache.templates)) {
        delete cache.templates[used];
      }
    });
  };

  // Update watched cache: process application.cache.updates array
  //
  application.updateCache = function() {
    application.emit('change');
    var updates = cache.updates,
        files = {};
    api.metasync.each(updates, function(relPath, cb) {
      var filePath = application.dir + relPath;
      api.fs.exists(filePath, function(exists) {
        if (exists) {
          api.fs.stat(filePath, function(err, stats) {
            if (err) return cb();
            if (stats.isFile()) files[filePath] = stats;
            else {
              // Refresh all cached files in directory
              for (var key in cache.files) {
                if (
                  key !== filePath &&
                  api.common.startsWith(key, filePath) && !files[key]
                ) {
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
    cache.timer = null;
    cache.updates = [];
  };

  // Cache watchers
  //   relPath - relative path to file or directory to watch
  //
  cache.watch = function(relPath) {
    var filePath = application.dir + relPath,
        watchInterval = api.common.getByPath(impress.config, 'scale.watch'),
        watcher, path = filePath;
    if (application) {
      watcher = cache.watchers[relPath];
      if (!watcher) {
        api.fs.exists(path, function(exists) {
          if (exists) {
            watcher = api.fs.watch(path, function(event, fileName) {
              var filePath, relPath;
              if (fileName) filePath = path + '/' + fileName;
              else filePath = path;
              relPath = application.relative(filePath);
              if (cache.timer) {
                api.timers.clearTimeout(cache.timer);
              }
              if (cache.updates.indexOf(relPath) === -1) {
                cache.updates.push(relPath);
              }
              cache.timer = api.timers.setTimeout(
                application.updateCache,
                watchInterval
              );
            });
            watcher.on('error', function() {
              watcher.close();
            });
            cache.watchers[relPath] = watcher;
          }
        });
      }
    }
  };

};
