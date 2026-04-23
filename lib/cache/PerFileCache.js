'use strict';

class PerFileCache {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    this.reader = options.reader || null;
    this.indexes = {};
  }

  get totalUsed() {
    let total = 0;
    for (const name of Object.keys(this.indexes)) {
      for (const entry of this.indexes[name].entries.values()) {
        if (entry.kind === 'shared') total += entry.length;
      }
    }
    return total;
  }

  async load(name, filesMap) {
    const entries = new Map();
    for (const [key, file] of filesMap) {
      const entry = await this.#allocateEntry(file);
      entries.set(key, entry);
    }
    const index = { entries };
    this.indexes[name] = index;
    return index;
  }

  async allocate(name, key, file) {
    let index = this.indexes[name];
    if (!index) {
      index = { entries: new Map() };
      this.indexes[name] = index;
    }
    const entry = await this.#allocateEntry(file);
    index.entries.set(key, entry);
    return entry;
  }

  remove(name, key) {
    const index = this.indexes[name];
    if (!index) return null;
    const entry = index.entries.get(key);
    if (!entry) return null;
    index.entries.delete(key);
    return entry;
  }

  free() {}

  compact() {
    return null;
  }

  snapshot() {
    const indexes = {};
    for (const name of Object.keys(this.indexes)) {
      const { entries } = this.indexes[name];
      indexes[name] = { entries: [...entries] };
    }
    return { segments: null, indexes };
  }

  async #allocateEntry(file) {
    const { data, stat, path: filePath } = file;
    const size = stat?.size || 0;
    if (size > this.maxFileSize) {
      return { kind: 'disk', path: filePath, stat, data: null };
    }
    if (!data && !this.reader) {
      return { kind: 'disk', path: filePath, stat, data: null };
    }
    if (size === 0) {
      const sab = new SharedArrayBuffer(0);
      return { kind: 'shared', sab, length: 0, stat };
    }
    const sab = new SharedArrayBuffer(size);
    if (data) {
      new Uint8Array(sab).set(data);
    } else if (this.reader) {
      await this.reader(filePath, sab, 0, size);
    }
    return { kind: 'shared', sab, length: size, stat };
  }

  static project(index) {
    const files = new Map();
    const entries =
      index.entries instanceof Map ? index.entries : new Map(index.entries);
    for (const [key, entry] of entries) {
      files.set(key, PerFileCache.projectEntry(entry));
    }
    return files;
  }

  static projectEntry(entry) {
    if (entry.kind === 'shared') {
      const { sab, length } = entry;
      const data = Buffer.from(sab, 0, length);
      return { data, stat: entry.stat };
    }
    return { data: null, stat: entry.stat, path: entry.path };
  }
}

module.exports = { PerFileCache };
