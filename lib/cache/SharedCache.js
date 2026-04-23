'use strict';

const { node, metarhia } = require('../deps.js');
const { LimitCache } = require('./LimitCache.js');
const { PerFileCache } = require('./PerFileCache.js');
const { PlacementSource } = require('./PlacementSource.js');

const DEFAULT_PLACEMENTS = [{ name: 'static' }, { name: 'resources' }];
const NOOP = () => {};

const PREFIXES = { k: 1, m: 2, g: 3, t: 4 };

const sizeToBytes = (value) => {
  if (typeof value === 'number') return value;
  const str = value.trim().toLowerCase();
  const binary = str.endsWith('ib');
  const suffix = binary ? 3 : 2;
  const unit = str.slice(-suffix);
  const num = parseInt(str.slice(0, -suffix));
  const base = binary ? 1024 : 1000;
  const exp = PREFIXES[unit[0]];
  if (!exp) throw new Error(`Unknown unit: ${unit}`);
  return num * base ** exp;
};

class SharedCache {
  constructor({ config, dir, console }) {
    const cacheConfig = config.cache || {};
    const mode = cacheConfig.mode || 'limit';
    const sabConfig = cacheConfig.sab || {};
    const maxFileSize = sizeToBytes(cacheConfig.maxFileSize || '10 mb');
    const reader = async (filePath, sab, offset, size) => {
      const fh = await node.fsp.open(filePath, 'r');
      try {
        const buf = Buffer.from(sab, offset, size);
        await fh.read(buf, 0, size, 0);
      } finally {
        await fh.close();
      }
    };

    if (mode === 'limit') {
      const limit = sizeToBytes(sabConfig.limit || '1 gib');
      const baseSegmentSize = sizeToBytes(
        sabConfig.baseSegmentSize || '64 mib',
      );
      this.cache = new LimitCache({
        limit,
        baseSegmentSize,
        maxFileSize,
        reader,
      });
    } else {
      this.cache = new PerFileCache({ maxFileSize, reader });
    }

    this.placements = cacheConfig.placements || DEFAULT_PLACEMENTS;
    this.dir = dir;
    this.config = config;
    this.console = console;
    this.sources = {};
    this.app = null;
    this.watcher = null;
    this.nextUpdateId = 0;

    // Pre-initialize ACK-dependent functions
    const needsAck = mode === 'limit';
    if (needsAck) {
      this.pendingFrees = new Map();
      this.#afterAck = (pending) => {
        this.#freeEntries(pending);
      };
    } else {
      this.pendingFrees = null;
      this.#afterAck = NOOP;
    }
    this.needsAck = needsAck;
  }

  #afterAck;

  async initialize() {
    const appObj = {
      path: this.dir,
      config: this.config,
      watcher: null,
      console: this.console,
      absolute: (relative) => node.path.join(this.dir, relative),
    };
    const timeout = this.config.server.timeouts.watch;
    const { DirectoryWatcher } = metarhia.metawatch;
    this.watcher = new DirectoryWatcher({ timeout });
    appObj.watcher = this.watcher;
    for (const placement of this.placements) {
      const opts = placement.ext ? { ext: placement.ext } : {};
      this.sources[placement.name] = new PlacementSource(
        placement.name,
        appObj,
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

  watch(app) {
    this.app = app;
    const { sources, cache, needsAck } = this;

    const sourcesByName = new Map(Object.entries(sources));

    const findSource = (filePath) => {
      const relPath = node.path.relative(this.dir, filePath);
      if (!relPath || relPath.startsWith('..')) return null;
      if (node.path.isAbsolute(relPath)) return null;
      const sepIndex = relPath.indexOf(node.path.sep);
      const name = sepIndex === -1 ? relPath : relPath.substring(0, sepIndex);
      const source = sourcesByName.get(name);
      return source ? { name, source } : null;
    };

    let epoch = null;

    const processChange = async (ep, name, source, filePath) => {
      const stat = await node.fsp.stat(filePath).catch(() => null);
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
      const oldEntry = cache.indexes[name]?.entries.get(key);
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

    // Pre-build flush function for the mode
    if (needsAck) {
      this.#flushEpoch = this.#flushEpochWithAck;
    } else {
      this.#flushEpoch = this.#flushEpochFireAndForget;
    }
  }

  #flushEpoch;

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

  #flushEpochFireAndForget(epoch) {
    const { updates, deletes } = epoch;
    for (const name of Object.keys(updates)) {
      const { entries } = updates[name];
      if (entries.length === 0) continue;
      this.#broadcast({
        name: 'file-update',
        target: name,
        updates: entries,
      });
    }
    for (const name of Object.keys(deletes)) {
      const keys = deletes[name];
      if (keys.length === 0) continue;
      this.#broadcast({
        name: 'file-delete',
        target: name,
        keys,
      });
    }
  }

  #broadcast(data) {
    for (const thread of this.app.threads.values()) {
      thread.postMessage(data);
    }
  }

  #freeEntries(pending) {
    if (!pending) return;
    for (const entry of pending.entries) this.cache.free(entry);
    const { pool, registry } = this.cache;
    const segs = [...pool.segments.values()];
    const cleanCount = pool.cleanSegmentIds.size;
    const info = segs.map((s) => {
      const used = registry.segmentUsed(s.id);
      const pct = ((used / s.size) * 100).toFixed(1);
      const mark = pool.cleanSegmentIds.has(s.id) ? ' [clean]' : '';
      return `  seg ${s.id}: ${used}/${s.size} (${pct}%)${mark}`;
    });
    const count = pending.entries.length;
    this.console.info(
      `[cache] freeEntries: ${count} entries freed, ` +
        `${segs.length} segments (${cleanCount} clean), ` +
        `totalUsed=${this.cache.totalUsed}\n${info.join('\n')}`,
    );
    this.#tryCompact();
  }

  #tryCompact() {
    const result = this.cache.compact();
    if (!result) {
      this.console.info('[cache] compact: no target found');
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
    const workerIds = new Set(this.app.threads.keys());
    this.pendingFrees.set(updateId, { workerIds, entries });
  }
}

module.exports = { SharedCache, sizeToBytes };
