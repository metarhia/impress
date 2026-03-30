'use strict';

const { node, metarhia } = require('./deps.js');

const WIN = process.platform === 'win32';
const MAX_FILE_SIZE = '10 mb';
const STREAM_THRESHOLD = '1 mb';

class StaticCache {
  constructor(appPath, config) {
    this.appPath = appPath;
    this.places = new Map();
    this.directories = [];
    this.version = 0;
    this.watcher = null;
    const cacheConfig = config?.cache || {};
    const { sizeToBytes } = metarhia.metautil;
    this.maxFileSize = sizeToBytes(cacheConfig.maxFileSize || MAX_FILE_SIZE);
    this.streamThreshold = sizeToBytes(
      cacheConfig.streamThreshold || STREAM_THRESHOLD,
    );
  }

  static getKey(filePath, basePath) {
    const key = filePath.substring(basePath.length);
    if (WIN) return metarhia.metautil.replace(key, node.path.sep, '/');
    return key;
  }

  async loadPlace(name) {
    const dirPath = node.path.join(this.appPath, name);
    await metarhia.metautil.ensureDirectory(dirPath);
    const files = new Map();
    this.places.set(name, { files, path: dirPath });
    await this._loadDir(name, dirPath);
    return StaticCache.getPlaceEntries(this, name);
  }

  async _loadDir(placeName, dirPath) {
    this.directories.push(dirPath);
    try {
      const items = await node.fsp.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.eslint')) continue;
        const filePath = node.path.join(dirPath, item.name);
        if (item.isDirectory()) await this._loadDir(placeName, filePath);
        else await this._loadFile(placeName, filePath);
      }
    } catch {
      // Directory may not exist yet
    }
  }

  async _loadFile(placeName, filePath) {
    const place = this.places.get(placeName);
    try {
      const stat = await node.fsp.stat(filePath);
      const key = StaticCache.getKey(filePath, place.path);
      const ver = ++this.version;
      if (stat.size > this.maxFileSize) {
        const entry = {
          key,
          sab: null,
          byteLength: 0,
          size: stat.size,
          version: ver,
        };
        place.files.set(key, entry);
        return;
      }
      const data = await node.fsp.readFile(filePath);
      const sab = new SharedArrayBuffer(data.byteLength);
      new Uint8Array(sab).set(data);
      const entry = {
        key,
        sab,
        byteLength: data.byteLength,
        size: stat.size,
        version: ver,
      };
      place.files.set(key, entry);
    } catch {
      // File may have been removed between readdir and stat
    }
  }

  static getPlaceEntries(cache, name) {
    const place = cache.places.get(name);
    if (!place) return [];
    return Array.from(place.files.values());
  }

  startWatch(timeout, broadcast) {
    const { DirectoryWatcher } = metarhia.metawatch;
    this.watcher = new DirectoryWatcher({ timeout });
    for (const dir of this.directories) {
      this.watcher.watch(dir);
    }

    this.watcher.on('change', (filePath) => {
      const resolved = this._resolve(filePath);
      if (!resolved.name) return;
      const { name } = resolved;
      node.fs.stat(filePath, async (err, stat) => {
        if (err) return;
        if (stat.isDirectory()) {
          this.watcher.watch(filePath);
          await this._loadDir(name, filePath);
          const entries = StaticCache.getPlaceEntries(this, name);
          broadcast({ name: 'cache-init', place: name, entries });
          return;
        }
        await this._loadFile(name, filePath);
        const place = this.places.get(name);
        const key = StaticCache.getKey(filePath, place.path);
        const entry = place.files.get(key);
        if (entry) {
          broadcast({ name: 'cache-update', place: name, entry });
        }
      });
    });

    this.watcher.on('delete', (filePath) => {
      const resolved = this._resolve(filePath);
      if (!resolved.name) return;
      const { name, key } = resolved;
      const place = this.places.get(name);
      if (place) {
        place.files.delete(key);
        broadcast({ name: 'cache-delete', place: name, key });
      }
    });
  }

  _resolve(filePath) {
    for (const [name, place] of this.places) {
      if (filePath.startsWith(place.path)) {
        const key = StaticCache.getKey(filePath, place.path);
        return { name, key };
      }
    }
    return {};
  }

  close() {
    if (this.watcher) this.watcher.close();
  }
}

module.exports = { StaticCache };
