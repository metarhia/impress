'use strict';

const path = require('node:path');
const fsp = require('node:fs/promises');
const { DirectoryWatcher } = require('metawatch');
const metautil = require('metautil');
const { FilesystemCache } = require('./FilesystemCache.js');
const { PlacementSource } = require('./PlacementSource.js');

const DEFAULT_PLACEMENTS = [{ name: 'static' }, { name: 'resources' }];

class SharedCache {
  constructor({ limit, baseSegmentSize, maxFileSize, watchTimeout, placements, dir, console, broadcast, getWorkerIds }) {
    const reader = async (filePath, sab, offset, size) => {
      const fh = await fsp.open(filePath, 'r');
      try {
        const buf = Buffer.from(sab, offset, size);
        await fh.read(buf, 0, size, 0);
      } finally {
        await fh.close();
      }
    };

    this.cache = new FilesystemCache({
      limit: metautil.sizeToBytes(limit || '1 gib'),
      baseSegmentSize: metautil.sizeToBytes(baseSegmentSize || '64 mib'),
      maxFileSize: metautil.sizeToBytes(maxFileSize || '10 mb'),
      reader,
    });

    this.placements = placements || DEFAULT_PLACEMENTS;
    this.dir = dir;
    this.watchTimeout = watchTimeout;
    this.console = console;
    this.broadcast = broadcast;
    this.getWorkerIds = getWorkerIds;
    this.sources = {};
    this.watcher = null;
    this.nextUpdateId = 0;
    this.pendingFrees = new Map();
    this.#afterAck = (pending) => {
      this.#freeEntries(pending);
    };
  }

  #afterAck;

  async initialize() {
    this.watcher = new DirectoryWatcher({ timeout: this.watchTimeout });
    for (const placement of this.placements) {
      const opts = placement.ext ? { ext: placement.ext } : {};
      this.sources[placement.name] = new PlacementSource(
        placement.name,
        this.dir,
        this.watcher,
        opts,
      );
    }
    for (const name of Object.keys(this.sources)) {
      const source = this.sources[name];
      await source.load();
      await this.cache.load(name, source.files);
    }
  }

  snapshot() {
    return this.cache.snapshot();
  }

  handleAck(updateId, workerId) {
    if (!this.pendingFrees) return;
    const pending = this.pendingFrees.get(updateId);
    if (!pending) return;
    pending.workerIds.delete(workerId);
    if (pending.workerIds.size === 0) {
      this.#afterAck(pending);
      this.pendingFrees.delete(updateId);
    }
  }

  handleWorkerExit(workerId) {
    if (!this.pendingFrees) return;
    for (const [updateId, pending] of this.pendingFrees) {
      pending.workerIds.delete(workerId);
      if (pending.workerIds.size === 0) {
        this.#afterAck(pending);
        this.pendingFrees.delete(updateId);
      }
    }
  }

  watch() {
    const { sources, cache } = this;

    const sourcesByName = new Map(Object.entries(sources));

    const findSource = (filePath) => {
      const relPath = path.relative(this.dir, filePath);
      if (!relPath || relPath.startsWith('..')) return null;
      if (path.isAbsolute(relPath)) return null;
      const sepIndex = relPath.indexOf(path.sep);
      const name = sepIndex === -1 ? relPath : relPath.substring(0, sepIndex);
      const source = sourcesByName.get(name);
      return source ? { name, source } : null;
    };

    let epoch = null;

    const processChange = async (ep, name, source, filePath) => {
      const stat = await fsp.stat(filePath).catch(() => null);
      if (!stat) return;
      if (stat.isDirectory()) {
        const before = new Set(source.files.keys());
        await source.load(filePath);
        for (const [key, file] of source.files) {
          if (before.has(key)) continue;
          const newEntry = await cache.allocate(name, key, file);
          const group =
            ep.updates[name] ||
            (ep.updates[name] = { entries: [], segmentIds: new Set() });
          group.entries.push([key, newEntry]);
          if (newEntry.kind === 'shared' && newEntry.segmentId) {
            group.segmentIds.add(newEntry.segmentId);
          }
        }
        return;
      }
      await source.change(filePath);
      const key = source.getKey(filePath);
      const file = source.files.get(key);
      if (!file) return;
      const oldEntry = cache.filesystems[name]?.entries.get(key);
      const newEntry = await cache.allocate(name, key, file);
      const group =
        ep.updates[name] ||
        (ep.updates[name] = { entries: [], segmentIds: new Set() });
      group.entries.push([key, newEntry]);
      if (newEntry.kind === 'shared' && newEntry.segmentId) {
        group.segmentIds.add(newEntry.segmentId);
      }
      if (oldEntry && oldEntry.kind === 'shared') {
        ep.oldEntries.push(oldEntry);
      }
    };

    const processDelete = (ep, name, source, filePath) => {
      const prefix = source.getKey(filePath);
      const keys = [];
      const exactEntry = source.files.get(prefix);
      if (exactEntry) {
        source.files.delete(prefix);
        keys.push(prefix);
      }
      const dirPrefix = prefix.endsWith('/') ? prefix : prefix + '/';
      for (const key of source.files.keys()) {
        if (key.startsWith(dirPrefix)) {
          source.files.delete(key);
          keys.push(key);
        }
      }
      if (keys.length === 0) return;
      const group = ep.deletes[name] || (ep.deletes[name] = []);
      for (const key of keys) {
        group.push(key);
        const old = cache.remove(name, key);
        if (old && old.kind === 'shared') ep.oldEntries.push(old);
      }
    };

    this.watcher.on('before', () => {
      epoch = { updates: {}, deletes: {}, oldEntries: [], promises: [] };
    });

    this.watcher.on('change', (filePath) => {
      const entry = findSource(filePath);
      const ep = epoch;
      if (entry && ep) {
        ep.promises.push(processChange(ep, entry.name, entry.source, filePath));
      }
    });

    this.watcher.on('delete', (filePath) => {
      const entry = findSource(filePath);
      const ep = epoch;
      if (entry && ep) processDelete(ep, entry.name, entry.source, filePath);
    });

    this.watcher.on('after', () => {
      const current = epoch;
      epoch = null;
      if (!current) return;
      Promise.all(current.promises)
        .then(() => this.#flushEpoch(current))
        .catch((err) => this.console.error(`[cache] epoch: ${err.message}`));
    });
  }

  #flushEpoch(epoch) {
    return this.#flushEpochWithAck(epoch);
  }

  #flushEpochWithAck(epoch) {
    const { updates, deletes, oldEntries } = epoch;
    let lastUpdateId = 0;
    for (const name of Object.keys(updates)) {
      const { entries, segmentIds } = updates[name];
      if (entries.length === 0) continue;
      const newSegments = [];
      for (const id of segmentIds) {
        const seg = this.cache.getSegment(id);
        if (seg) newSegments.push({ id: seg.id, sab: seg.sab });
      }
      lastUpdateId = ++this.nextUpdateId;
      this.#broadcast({
        name: 'file-update',
        target: name,
        updateId: lastUpdateId,
        updates: entries,
        newSegments,
      });
    }
    for (const name of Object.keys(deletes)) {
      const keys = deletes[name];
      if (keys.length === 0) continue;
      lastUpdateId = ++this.nextUpdateId;
      this.#broadcast({
        name: 'file-delete',
        target: name,
        updateId: lastUpdateId,
        keys,
      });
    }
    if (oldEntries.length > 0 && lastUpdateId > 0) {
      this.#trackUpdate(lastUpdateId, oldEntries);
    }
  }

  #broadcast(data) {
    this.broadcast(data);
  }

  #freeEntries(pending) {
    if (!pending) return;
    for (const entry of pending.entries) this.cache.free(entry);
    const { segmentCount, cleanCount, totalUsed, lines } = this.cache.stats();
    const count = pending.entries.length;
    this.console.debug(
      `[cache] freeEntries: ${count} entries freed, ` +
        `${segmentCount} segments (${cleanCount} clean), ` +
        `totalUsed=${totalUsed}\n${lines.join('\n')}`,
    );
    this.#tryCompact();
  }

  #tryCompact() {
    const result = this.cache.compact();
    if (!result) {
      this.console.debug('[cache] compact: no target found');
      return;
    }
    this.console.info(
      `[cache] compact: moved ${result.updates.length} files, ` +
        `freed ${result.oldEntries.length} old entries`,
    );
    const byName = {};
    for (const { name, key, entry } of result.updates) {
      if (!byName[name]) byName[name] = [];
      byName[name].push([key, entry]);
    }
    let lastUpdateId = 0;
    for (const name of Object.keys(byName)) {
      lastUpdateId = ++this.nextUpdateId;
      this.#broadcast({
        name: 'file-update',
        target: name,
        updateId: lastUpdateId,
        updates: byName[name],
        newSegments: result.newSegments,
      });
    }
    if (result.oldEntries.length > 0 && lastUpdateId > 0) {
      this.#trackUpdate(lastUpdateId, result.oldEntries);
    }
  }

  #trackUpdate(updateId, entries) {
    const workerIds = new Set(this.getWorkerIds());
    this.pendingFrees.set(updateId, { workerIds, entries });
  }
}

module.exports = { SharedCache };
