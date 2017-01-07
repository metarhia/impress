'use strict';

// Impress Application Full Memory Cache

// This plugin should be mixed to impress application

impress.cache.mixImpress = true;

impress.cache.mixin = (application) => {

  const cache = application.cache;

  cache.hash = (
    // Extend Map interface total allocated size: map.allocated
  ) => {
    const map = new Map();
    map.allocated = 0;

    map.add = (key, val) => {
      if (map.has(key)) {
        const prev = map.get(key);
        map.allocated -= cache.sizeOf(prev);
      }
      map.allocated += cache.sizeOf(val);
      map.set(key, val);
    };

    map.del = (key) => {
      if (map.has(key)) {
        const val = map.get(key);
        map.allocated -= cache.sizeOf(val);
      }
    };

    map.clearStartingWith = (
      startsWith // string to compare with key start
    ) => {
      let key, val;
      for ([key, val] of cache) {
        if (key.startsWith(startsWith)) {
          map.allocated -= cache.sizeOf(val);
          cache.delete(key);
        }
      }
    };

    return map;
  };

  cache.sizeOf = (data) => (data || data.lenght) ? data.length : 0;

  cache.init = () => {
    cache.templates = new Map(); // template body cache indexed by file name
    cache.files = new Map(); // files cache indexed by file name
    cache.folders = new Map(); // folder existence cache indexed by folder name
    cache.scripts = new Map(); // compiled vm scripts
    cache.watchers = new Map(); // directory watchers indexed by directory name
    cache.timer = null; // timer to consolidate watch changes
    cache.updates = []; // array of changes to update on next timer event
    cache.static = cache.hash(); // static files cache
    cache.pages = new Map(); // rendered pages cache
  };

  cache.init();


  cache.clear = () => {
    application.config = {};
    if (cache) {
      if (cache.timer) {
        api.timers.clearTimeout(cache.timer);
      }
      let watcherPath, watcher;
      for ([watcherPath, watcher] in cache.watchers) {
        watcher.close();
      }
    }
    cache.init();
  };

  cache.purge = () => {
    if (cache.static.allocated > application.config.files.cacheSize) {
      let name, item;
      for ([name, item] of cache.static) {
        if (item.data) {
          cache.static.del(name);
          if (cache.static.allocated < application.config.files.cacheSize) {
            return;
          }
        }
      }
    }
  };

  application.updateFileCache = (
    filePath, // file path relative to application base directory
    stats // instance of fs.Stats
  ) => {
    api.fs.exists(filePath, (exists) => {
      if (!exists) application.cliearDirectoryCache(filePath);
      else {
        const ext = api.common.fileExt(filePath);
        const relPath = application.relative(filePath);
        api.common.clearCacheStartingWith(cache.pages, relPath);
        if (cache.static.has(relPath)) {
          // Replace static files memory cache
          application.compress(filePath, stats);
        } else if (ext === 'js') {
          // Replace changed js file in cache or add it to cache
          // to be removed: if (relPath in application.cache.scripts)
          cache.scripts.set(relPath, null);
          application.createScript(filePath, (err, exports) => {
            cache.scripts.set(relPath, exports);
            const sectionName = api.path.basename(filePath, '.js');
            let placeName = filePath.substring(application.dir.length + 1);
            const k = placeName.indexOf('/');
            if (k > -1) {
              placeName = placeName.substring(0, k);
              if (placeName === 'model') {
                // Load models
              } else if (placeName === 'api') {
                const parsedPath = relPath.split('/');
                const interfaceName = parsedPath[2];
                let methodName = parsedPath[3];
                methodName = methodName.substr(0, methodName.length - 3);
                const apiInterface = application.api[interfaceName] || {};
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
          cache.templates.delete(relPath);
          cache.files.delete(relPath);
          api.fs.readFile(filePath, 'utf8', (err, tpl) => {
            if (!err) {
              if (!tpl) tpl = impress.FILE_IS_EMPTY;
              else tpl = api.common.removeBOM(tpl);
              cache.templates.set(relPath, tpl);
            }
          });
        }
      }
    });
  };

  application.cliearDirectoryCache = (
    filePath // file path relative to application base directory
  ) => {
    const relPath = application.relative(filePath);
    cache.static.clearStartingWith(relPath);
    api.common.clearCacheStartingWith(cache.folders, relPath);
    api.common.clearCacheStartingWith(cache.pages, relPath);
    api.common.clearCacheStartingWith(cache.files, relPath, (used) => {
      const ext = api.common.fileExt(used);
      if (ext === 'js' && cache.scripts.has(used)) {
        cache.scripts.delete(used);
      } else if (ext === 'template') {
        cache.templates.delete(used);
      }
    });
  };

  application.updateCache = () => {
    application.emit('change');
    const updates = cache.updates;
    const files = {};
    api.metasync.each(updates, (relPath, cb) => {
      const filePath = application.dir + relPath;
      api.fs.exists(filePath, (exists) => {
        if (exists) {
          api.fs.stat(filePath, (err, stats) => {
            if (err) return cb();
            if (stats.isFile()) files[filePath] = stats;
            else {
              // Refresh all cached files in directory
              let key, val;
              for ([key, val] in cache.files) {
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
      let filePath, stats;
      for (filePath in files) {
        stats = files[filePath];
        application.updateFileCache(filePath, stats);
      }
      application.emit('changed');
    });
    cache.timer = null;
    cache.updates = [];
  };

  cache.watch = (
    relPath // relative path to file or directory to watch
  ) => {
    const filePath = application.dir + relPath;
    const watchInterval = api.common.getByPath(impress.config, 'scale.watch');
    const path = filePath;
    let watcher;
    if (application) {
      watcher = cache.watchers.get(relPath);
      if (!watcher) {
        api.fs.exists(path, (exists) => {
          if (exists) {
            watcher = api.fs.watch(path, (event, fileName) => {
              const filePath = fileName ? path + '/' + fileName : path;
              const relPath = application.relative(filePath);
              if (cache.timer) {
                api.timers.clearTimeout(cache.timer);
              }
              if (!cache.updates.includes(relPath)) {
                cache.updates.push(relPath);
              }
              cache.timer = api.timers.setTimeout(
                application.updateCache,
                watchInterval
              );
            });
            watcher.on('error', () => watcher.close());
            cache.watchers.set(relPath, watcher);
          }
        });
      }
    }
  };

};
