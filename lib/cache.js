'use strict';

// Impress Application Full Memory Cache

const DEFAULT_WATCH_INTERVAL = 2000;

const extUpdate = {

  js: (application, filePath, relPath) => {
    application.cache.scripts.del(relPath);
    impress.createScript(application, filePath, (err, exports) => {
      if (err) return;
      application.cache.scripts.add(relPath, exports);
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
          application.config.sections[sectionName] = exports;
        } else if (placeName === 'tasks') {
          application.scheduler.setTask(sectionName, exports);
        }
      }
    });
  },

  template: (application, filePath, relPath) => {
    application.cache.templates.del(relPath);
    api.fs.readFile(filePath, 'utf8', (err, tpl) => {
      if (err) {
        impress.log.error(impress.CANT_READ_FILE + filePath);
        return;
      }
      if (!tpl) tpl = impress.FILE_IS_EMPTY;
      else tpl = api.common.removeBOM(tpl);
      application.cache.templates.add(relPath, tpl);
    });
  }

};

class Cache {

  constructor(application) {
    this.application = application;
    const { scale } = impress.config.sections;
    this.watchInterval = scale ? scale.watch : DEFAULT_WATCH_INTERVAL;
  }

  init() {
    this.templates = api.common.cache(); // templates indexed by file name
    this.files = api.common.cache(); // files cache indexed by file name
    this.folders = api.common.cache(); // existence cache indexed by name
    this.scripts = api.common.cache(); // compiled vm scripts cache
    this.watchers = api.common.cache(); // directory watchers indexed by name
    this.timer = null; // timer to consolidate watch changes
    this.updates = []; // array of changes to update on next timer event
    this.static = api.common.cache({ calcSize: true }); // static files cache
    this.pages = api.common.cache(); // rendered pages cache
    if (!this.application.isImpress) {
      this.application.on('loaded', () => {
        this.cacheSize = this.application.config.sections.files.cacheSize;
      });
    }
  }

  clear() {
    this.application.config.sections = {};
    if (this.timer) {
      clearTimeout(this.timer);
    }
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.init();
  }

  purgeNeeded() {
    return this.static.allocated > this.cacheSize;
  }

  purge() {
    if (!this.purgeNeeded()) return;
    for (const [name, item] of this.static) {
      if (item.data) {
        this.static.del(name);
        if (!this.purgeNeeded()) return;
      }
    }
  }

  // Update file cache
  //   filePath <string> file path relative to application base directory
  //   stats <Stats> instance of fs.Stats
  updateFileCache(filePath, stats) {
    api.fs.access(filePath, err => {
      if (err) {
        this.clearDirectoryCache(filePath);
        return;
      }
      const ext = api.common.fileExt(filePath);
      const relPath = this.application.relative(filePath);
      this.pages.clr(relPath);
      this.files.del(relPath);
      if (this.static.has(relPath)) {
        this.application.compress(filePath, stats);
        return;
      }
      const update = extUpdate[ext];
      if (update) update(this.application, filePath, relPath);
    });
  }

  // Clear directory cache
  //   filePath <string> file path relative to application base directory
  clearDirectoryCache(filePath) {
    const relPath = this.application.relative(filePath);
    this.static.clr(relPath);
    this.folders.clr(relPath);
    this.pages.clr(relPath);
    this.files.clr(relPath, used => {
      const ext = api.common.fileExt(used);
      if (ext === 'js' && this.scripts.has(used)) {
        this.scripts.del(used);
      } else if (ext === 'template') {
        this.templates.del(used);
      }
    });
  }

  updateCache() {
    this.application.emit('change');
    const updates = this.updates;
    this.updates = [];
    this.timer = null;
    const files = [];
    const stats = [];
    api.metasync.each(updates, (relPath, next) => {
      const filePath = this.application.dir + relPath;
      impress.log.debug('Reload: ' + relPath);
      api.fs.stat(filePath, (err, stat) => {
        if (err) {
          this.clearDirectoryCache(filePath);
          next();
          return;
        }
        if (stat.isFile()) {
          files.push(filePath);
          stats.push(stat);
          next();
          return;
        }
        // Directory changed
        for (const key of this.files.keys()) {
          const starts = key.startsWith(filePath);
          const includes = files.includes(key);
          if (starts && !includes) {
            files.push(key);
            stats.push(stat);
          }
        }
        next();
      });
    }, () => {
      for (let i = 0; i < files.length; i++) {
        this.updateFileCache(files[i], stats[i]);
      }
      this.application.emit('changed');
    });
  }

  // Watch
  //   relPath <string> relative path to file or directory to watch
  watch(relPath) {
    const path = api.path.join(this.application.dir, relPath);
    const watcher = this.watchers.get(relPath);
    if (watcher) return;
    api.fs.access(path, err => {
      if (err) return;
      const watcher = api.fs.watch(path, (event, fileName) => {
        const filePath = fileName ? api.path.join(path, fileName) : path;
        const relPath = this.application.relative(filePath);
        if (this.timer) clearTimeout(this.timer);
        if (!this.updates.includes(relPath)) this.updates.push(relPath);
        this.timer = setTimeout(
          this.updateCache.bind(this),
          this.watchInterval
        );
      });
      watcher.on('error', () => {
        watcher.close();
      });
      this.watchers.add(relPath, watcher);
    });
  }

}

impress.Cache = Cache;
