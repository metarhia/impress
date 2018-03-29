'use strict';

// Impress Application Full Memory Cache

const mixin = (application) => {

  const cache = {};
  application.cache = cache;

  cache.init = () => {
    cache.templates = api.common.cache(); // templates indexed by file name
    cache.files = api.common.cache(); // files cache indexed by file name
    cache.folders = api.common.cache(); // existence cache indexed by name
    cache.scripts = api.common.cache(); // compiled vm scripts cache
    cache.watchers = api.common.cache(); // directory watchers indexed by name
    cache.timer = null; // timer to consolidate watch changes
    cache.updates = []; // array of changes to update on next timer event
    cache.static = api.common.cache({ calcSize: true }); // static files cache
    cache.pages = api.common.cache(); // rendered pages cache
  };

  cache.init();

  cache.clear = () => {
    application.config = {};
    if (cache) {
      if (cache.timer) {
        api.timers.clearTimeout(cache.timer);
      }
      let watcher;
      for (watcher of cache.watchers.values()) {
        watcher.close();
      }
    }
    cache.init();
  };

  cache.purgeNeeded = () => (
    cache.static.allocated > application.config.files.cacheSize
  );

  cache.purge = () => {
    if (!cache.purgeNeeded()) return;
    cache.static.forEach((item, name) => {
      if (item.data) {
        cache.static.del(name);
        if (!cache.purgeNeeded()) return;
      }
    });
  };

  const extUpdate = {};

  extUpdate.js = (filePath, relPath) => {
    cache.scripts.del(relPath);
    application.createScript(filePath, (err, exports) => {
      if (err) return;
      cache.scripts.add(relPath, exports);
      const sectionName = api.path.basename(filePath, '.js');
      let placeName = filePath.substring(application.dir.length + 1);
      const k = placeName.indexOf('/');
      if (k > -1) {
        placeName = placeName.substring(0, k);
        if (placeName === 'api') {
          const parsedPath = relPath.split('/');
          const interfaceName = parsedPath[2];
          let methodName = parsedPath[3];
          methodName = api.common.removeExt(methodName);
          const apiInterface = application.api[interfaceName] || {};
          apiInterface[methodName] = exports;
        } else if (placeName === 'config') {
          application.config[sectionName] = exports;
          application.preprocessConfig();
        } else if (placeName === 'tasks') {
          application.addTask(sectionName, exports);
        }
      }
    });
  };

  extUpdate.template = (filePath, relPath) => {
    cache.templates.del(relPath);
    api.fs.readFile(filePath, 'utf8', (err, tpl) => {
      if (err) {
        application.log.error(impress.CANT_READ_FILE + filePath);
        return;
      }
      if (!tpl) tpl = impress.FILE_IS_EMPTY;
      else tpl = api.common.removeBOM(tpl);
      cache.templates.add(relPath, tpl);
    });
  };

  application.updateFileCache = (
    filePath, // file path relative to application base directory
    stats // instance of fs.Stats
  ) => {
    api.fs.access(filePath, (err) => {
      if (err) {
        application.clearDirectoryCache(filePath);
        return;
      }
      const ext = api.common.fileExt(filePath);
      const relPath = application.relative(filePath);
      cache.pages.clr(relPath);
      cache.files.del(relPath);
      if (cache.static.has(relPath)) {
        application.compress(filePath, stats);
        return;
      }
      const update = extUpdate[ext];
      if (update) update(filePath, relPath);
    });
  };

  application.clearDirectoryCache = (
    filePath // file path relative to application base directory
  ) => {
    const relPath = application.relative(filePath);
    cache.static.clr(relPath);
    cache.folders.clr(relPath);
    cache.pages.clr(relPath);
    cache.files.clr(relPath, (used) => {
      const ext = api.common.fileExt(used);
      if (ext === 'js' && cache.scripts.has(used)) {
        cache.scripts.del(used);
      } else if (ext === 'template') {
        cache.templates.del(used);
      }
    });
  };

  application.updateCache = () => {
    application.emit('change');
    const updates = cache.updates;
    cache.updates = [];
    cache.timer = null;
    const files = [];
    const stats = [];
    api.metasync.each(updates, (relPath, cb) => {
      const filePath = application.dir + relPath;
      api.fs.stat(filePath, (err, stat) => {
        if (err) {
          application.clearDirectoryCache(filePath);
          cb();
          return;
        }
        if (stat.isFile()) {
          files.push(filePath);
          stats.push(stat);
          cb();
          return;
        }
        // Directory changed
        let key, starts, includes;
        for (key of cache.files.keys()) {
          starts = key.startsWith(filePath);
          includes = files.includes(key);
          if (starts && !includes) {
            files.push(key);
            stats.push(stat);
          }
        }
        cb();
      });
    }, () => {
      let i, ilen;
      for (i = 0, ilen = files.length; i < ilen; i++) {
        application.updateFileCache(files[i], stats[i]);
      }
      application.emit('changed');
    });
  };

  cache.watch = (
    relPath // relative path to file or directory to watch
  ) => {
    const path = application.dir + relPath;
    const timeout = api.common.getByPath(impress.config, 'scale.watch');
    let watcher = cache.watchers.get(relPath);
    if (watcher) return;
    api.fs.access(path, (err) => {
      if (err) return;
      watcher = api.fs.watch(path, (event, fileName) => {
        const filePath = fileName ? path + '/' + fileName : path;
        const relPath = application.relative(filePath);
        if (cache.timer) api.timers.clearTimeout(cache.timer);
        if (!cache.updates.includes(relPath)) cache.updates.push(relPath);
        cache.timer = api.timers.setTimeout(application.updateCache, timeout);
      });
      watcher.on('error', () => {
        watcher.close();
      });
      cache.watchers.add(relPath, watcher);
    });
  };

};

module.exports = {
  mixinImpress: mixin,
  mixinApplication: mixin
};
