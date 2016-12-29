'use strict';

// Impress Application Full Memory Cache

// This plugin should be mixed to impress application
//
impress.cache.mixImpress = true;

// Mixin application methods to given object
// Application should have:
//   .dir - application root
//
impress.cache.mixin = (application) => {

  let cache = application.cache;

  // Init application cache
  //
  cache.init = () => {
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
  cache.clear = () => {
    application.config = {};
    if (cache) {
      let watcher;
      if (cache.timer) {
        api.timers.clearTimeout(cache.timer);
      }
      for (let watcherPath in cache.watchers) {
        watcher = cache.watchers[watcherPath];
        watcher.close();
      }
    }
    cache.init();
  };

  // Purge application cache
  //
  cache.purge = () => {
    if (cache.size > application.config.files.cacheSize) {
      for (let name in cache.static) {
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
  cache.add = (relPath, item) => {
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
  application.updateFileCache = (filePath, stats) => {
    api.fs.exists(filePath, (exists) => {
      if (!exists) application.cliearDirectoryCache(filePath);
      else {
        let ext = api.common.fileExt(filePath),
            relPath = application.relative(filePath);
        api.common.clearCacheStartingWith(cache.pages, relPath);
        if (relPath in cache.static) {
          // Replace static files memory cache
          application.compress(filePath, stats);
        } else if (ext === 'js') {
          // Replace changed js file in cache or add it to cache
          // to be removed: if (relPath in application.cache.scripts)
          cache.scripts[relPath] = null;
          application.createScript(filePath, (err, exports) => {
            cache.scripts[relPath] = exports;
            let sectionName = api.path.basename(filePath, '.js'),
                placeName = filePath.substring(application.dir.length + 1),
                k = placeName.indexOf('/');
            if (k !== -1) {
              placeName = placeName.substring(0, k);
              if (placeName === 'model') {
                // Load models
              } else if (placeName === 'api') {
                let parsedPath = relPath.split('/'),
                    interfaceName = parsedPath[2],
                    methodName = parsedPath[3];
                methodName = methodName.substr(0, methodName.length - 3);
                let apiInterface = application.api[interfaceName] || {};
                apiInterface[methodName] = exports;
                console.log(Object.keys(apiInterface));
              } else if (placeName === 'config') {
                // Reload config
                application.config[sectionName] = exports;
                application.preprocessConfig();
              } else if (placeName === 'tasks') {
                // Reload task
                application.setTask(sectionName, exports);
              }
            }
          });
        } else if (ext === 'template') {
          // Replace changed template file in cache
          delete cache.templates[relPath];
          delete cache.files[relPath];
          api.fs.readFile(filePath, 'utf8', (err, tpl) => {
            if (!err) {
              if (!tpl) tpl = impress.FILE_IS_EMPTY;
              else tpl = api.common.removeBOM(tpl);
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
  application.cliearDirectoryCache = (filePath) => {
    let relPath = application.relative(filePath);
    api.common.clearCacheStartingWith(cache.static, relPath);
    api.common.clearCacheStartingWith(cache.folders, relPath);
    api.common.clearCacheStartingWith(cache.pages, relPath);
    api.common.clearCacheStartingWith(cache.files, relPath, (used) => {
      let ext = api.common.fileExt(used);
      if (ext === 'js' && (used in cache.scripts)) {
        delete cache.scripts[used];
      } else if (ext === 'template' && (used in cache.templates)) {
        delete cache.templates[used];
      }
    });
  };

  // Update watched cache: process application.cache.updates array
  //
  application.updateCache = () => {
    application.emit('change');
    let updates = cache.updates,
        files = {};
    api.metasync.each(updates, (relPath, cb) => {
      let filePath = application.dir + relPath;
      api.fs.exists(filePath, (exists) => {
        if (exists) {
          api.fs.stat(filePath, (err, stats) => {
            if (err) return cb();
            if (stats.isFile()) files[filePath] = stats;
            else {
              // Refresh all cached files in directory
              for (let key in cache.files) {
                if (
                  key !== filePath &&
                  key.startsWith(filePath) &&
                  !files[key]
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
    }, () => {
      let stats;
      for (let filePath in files) {
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
  cache.watch = (relPath) => {
    let filePath = application.dir + relPath,
        watchInterval = api.common.getByPath(impress.config, 'scale.watch'),
        watcher, path = filePath;
    if (application) {
      watcher = cache.watchers[relPath];
      if (!watcher) {
        api.fs.exists(path, (exists) => {
          if (exists) {
            watcher = api.fs.watch(path, (event, fileName) => {
              let filePath, relPath;
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
            watcher.on('error', () => watcher.close());
            cache.watchers[relPath] = watcher;
          }
        });
      }
    }
  };

};
