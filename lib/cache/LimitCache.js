'use strict';

const DEFAULT_LIMIT = 1024 * 1024 * 1024;
const DEFAULT_BASE_SEGMENT_SIZE = 64 * 1024 * 1024;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

class Pool {
  constructor(limit, baseSegmentSize) {
    this.limit = limit;
    this.baseSegmentSize = baseSegmentSize;
    this.segments = new Map();
    this.cleanSegmentIds = new Set();
    this.totalUsed = 0;
    this.nextSegmentId = 1;
  }

  canAllocate(size) {
    return this.totalUsed + size <= this.limit;
  }

  createBaseSegment() {
    for (const id of this.cleanSegmentIds) {
      this.cleanSegmentIds.delete(id);
      return this.segments.get(id);
    }
    const size = this.baseSegmentSize;
    if (!this.canAllocate(size)) return null;
    const id = this.nextSegmentId++;
    const sab = new SharedArrayBuffer(size);
    const segment = { id, sab, size };
    this.segments.set(id, segment);
    this.totalUsed += size;
    return segment;
  }

  retireSegment(id) {
    if (!this.segments.has(id)) return false;
    if (this.cleanSegmentIds.has(id)) return true;
    this.cleanSegmentIds.add(id);
    return true;
  }

  getSegment(id) {
    return this.segments.get(id) || null;
  }

  getSegmentsSnapshot() {
    const result = [];
    for (const seg of this.segments.values()) {
      result.push({ id: seg.id, sab: seg.sab });
    }
    return result;
  }
}

class Registry {
  constructor(pool) {
    this.all = segments;
    this.freeExtents = new Map();
    this.tails = new Map();
  }

  registerSegment(segmentId) {
    this.freeExtents.set(segmentId, []);
    this.tails.set(segmentId, 0);
  }

  allocate(size, noCreate = false) {
    let bestFit = null;
    for (const [segmentId, extents] of this.freeExtents) {
      for (let i = 0; i < extents.length; i++) {
        const extent = extents[i];
        if (extent.length < size) continue;
        if (!bestFit || extent.length < bestFit.extent.length) {
          bestFit = { segmentId, index: i, extent };
        }
      }
    }
    if (bestFit) {
      const { segmentId, index, extent } = bestFit;
      const offset = extent.offset;
      const extents = this.freeExtents.get(segmentId);
      if (extent.length === size) {
        extents.splice(index, 1);
      } else {
        extents[index] = {
          offset: extent.offset + size,
          length: extent.length - size,
        };
      }
      return { segmentId, offset };
    }
    for (const [segmentId, tail] of this.tails) {
      if (tail + size <= this.pool.baseSegmentSize) {
        this.tails.set(segmentId, tail + size);
        return { segmentId, offset: tail };
      }
    }
    if (noCreate) return null;
    const segment = this.pool.createBaseSegment();
    if (!segment) return null;
    this.registerSegment(segment.id);
    this.tails.set(segment.id, size);
    return { segmentId: segment.id, offset: 0 };
  }

  free(segmentId, offset, length) {
    const extents = this.freeExtents.get(segmentId);
    if (!extents) return;
    const newExtent = { offset, length };
    let insertIndex = extents.findIndex((e) => e.offset > offset);
    if (insertIndex === -1) insertIndex = extents.length;
    extents.splice(insertIndex, 0, newExtent);
    Registry.mergeAdjacent(extents, insertIndex);
  }

  static mergeAdjacent(extents, index) {
    if (index + 1 < extents.length) {
      const current = extents[index];
      const next = extents[index + 1];
      if (current.offset + current.length === next.offset) {
        current.length += next.length;
        extents.splice(index + 1, 1);
      }
    }
    if (index > 0) {
      const prev = extents[index - 1];
      const current = extents[index];
      if (prev.offset + prev.length === current.offset) {
        prev.length += current.length;
        extents.splice(index, 1);
      }
    }
  }

  segmentUsed(segmentId) {
    const tail = this.tails.get(segmentId);
    if (!tail) return 0;
    const extents = this.freeExtents.get(segmentId);
    if (!extents) return tail;
    let free = 0;
    for (const e of extents) free += e.length;
    return tail - free;
  }

  isSegmentEmpty(segmentId) {
    return this.segmentUsed(segmentId) === 0;
  }

  unregisterSegment(segmentId) {
    this.freeExtents.delete(segmentId);
    this.tails.delete(segmentId);
  }
}

class LimitCache {
  constructor(options = {}) {
    const limit = options.limit || DEFAULT_LIMIT;
    const maxFileSize = options.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    const configured = options.baseSegmentSize || DEFAULT_BASE_SEGMENT_SIZE;
    const baseSegmentSize = Math.ceil(maxFileSize / configured) * configured;
    this.maxFileSize = maxFileSize;
    this.baseSegmentSize = baseSegmentSize;
    this.reader = options.reader || null;
    this.pool = new Pool(limit, baseSegmentSize);
    this.registry = new Registry(this.pool);
    this.indexes = {};
  }

  get totalUsed() {
    return this.pool.totalUsed;
  }

  getSegment(id) {
    return this.pool.getSegment(id);
  }

  async load(name, filesMap) {
    const entries = new Map();
    const segmentIds = new Set();
    const candidates = [...filesMap.entries()];
    candidates.sort((a, b) => (b[1].stat?.size || 0) - (a[1].stat?.size || 0));
    for (const [key, file] of candidates) {
      const entry = await this.#allocateEntry(file, segmentIds);
      entries.set(key, entry);
    }
    const index = { entries, segmentIds };
    this.indexes[name] = index;
    return index;
  }

  async allocate(name, key, file) {
    let index = this.indexes[name];
    if (!index) {
      index = { entries: new Map(), segmentIds: new Set() };
      this.indexes[name] = index;
    }
    const entry = await this.#allocateEntry(file, index.segmentIds);
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

  free(entry) {
    if (!entry || entry.kind !== 'shared' || entry.length === 0) return;
    const { segmentId } = entry;
    const segment = this.pool.getSegment(segmentId);
    if (!segment) return;
    this.registry.free(segmentId, entry.offset, entry.length);
    if (this.registry.isSegmentEmpty(segmentId)) {
      this.registry.unregisterSegment(segmentId);
      this.pool.retireSegment(segmentId);
    }
  }

  compact(threshold = 0.3) {
    let target = null;
    let minUtil = threshold;
    let baseCount = 0;
    for (const [segmentId, tail] of this.registry.tails) {
      if (tail === 0) continue;
      const segment = this.pool.getSegment(segmentId);
      if (!segment) continue;
      baseCount++;
      const used = this.registry.segmentUsed(segmentId);
      const util = used / segment.size;
      if (util < minUtil) {
        minUtil = util;
        target = segmentId;
      }
    }
    if (baseCount < 2 || !target) return null;
    const items = [];
    for (const name of Object.keys(this.indexes)) {
      for (const [key, entry] of this.indexes[name].entries) {
        if (entry.kind === 'shared' && entry.segmentId === target) {
          items.push({ name, key, entry });
        }
      }
    }
    if (items.length === 0) return null;
    const savedTail = this.registry.tails.get(target);
    const savedExtents = this.registry.freeExtents
      .get(target)
      .map((e) => ({ ...e }));
    this.registry.unregisterSegment(target);
    const moved = [];
    let success = true;
    for (const { name, key, entry } of items) {
      const allocation = this.registry.allocate(entry.length, true);
      if (!allocation) {
        success = false;
        break;
      }
      const oldSab = this.pool.getSegment(target).sab;
      const src = new Uint8Array(oldSab, entry.offset, entry.length);
      const dstSeg = this.pool.getSegment(allocation.segmentId);
      new Uint8Array(dstSeg.sab, allocation.offset, entry.length).set(src);
      moved.push({
        name,
        key,
        oldEntry: entry,
        newEntry: {
          kind: 'shared',
          segmentId: allocation.segmentId,
          offset: allocation.offset,
          length: entry.length,
          stat: entry.stat,
        },
      });
    }
    if (!success) {
      for (const { newEntry } of moved) {
        this.registry.free(
          newEntry.segmentId,
          newEntry.offset,
          newEntry.length,
        );
      }
      this.registry.registerSegment(target);
      this.registry.freeExtents.set(target, savedExtents);
      this.registry.tails.set(target, savedTail);
      return null;
    }
    const updates = [];
    const oldEntries = [];
    const newSegmentIds = new Set();
    for (const { name, key, oldEntry, newEntry } of moved) {
      this.indexes[name].entries.set(key, newEntry);
      this.indexes[name].segmentIds.add(newEntry.segmentId);
      newSegmentIds.add(newEntry.segmentId);
      updates.push({ name, key, entry: newEntry, oldEntry });
      oldEntries.push(oldEntry);
    }
    for (const name of Object.keys(this.indexes)) {
      this.indexes[name].segmentIds.delete(target);
    }
    const newSegments = [];
    for (const id of newSegmentIds) {
      const seg = this.pool.getSegment(id);
      if (seg) newSegments.push({ id: seg.id, sab: seg.sab });
    }
    return { updates, oldEntries, newSegments };
  }

  snapshot() {
    const segments = this.pool.getSegmentsSnapshot();
    const indexes = {};
    for (const name of Object.keys(this.indexes)) {
      const { entries } = this.indexes[name];
      indexes[name] = { entries: [...entries] };
    }
    return { segments, indexes };
  }

  async #allocateEntry(file, segmentIds) {
    const { data, stat, path: filePath } = file;
    const size = stat?.size || 0;
    if (size > this.maxFileSize) {
      return { kind: 'disk', path: filePath, stat, data: null };
    }
    if (!data && !this.reader) {
      return { kind: 'disk', path: filePath, stat, data: null };
    }
    if (size === 0) {
      return { kind: 'shared', segmentId: 0, offset: 0, length: 0, stat };
    }
    const allocation = this.registry.allocate(size);
    if (!allocation) return { kind: 'disk', path: filePath, stat, data: null };
    const { segmentId, offset } = allocation;
    const segment = this.pool.getSegment(segmentId);
    await this.#writeToSegment(segment.sab, offset, size, data, filePath);
    segmentIds.add(segmentId);
    return { kind: 'shared', segmentId, offset, length: size, stat };
  }

  async #writeToSegment(sab, offset, size, data, filePath) {
    if (size === 0) return;
    if (data) {
      const view = new Uint8Array(sab, offset, size);
      view.set(data);
      return;
    }
    if (this.reader) {
      await this.reader(filePath, sab, offset, size);
      return;
    }
    throw new Error(`No reader and no data for: ${filePath}`);
  }

  static project(index, segmentsMap) {
    const files = new Map();
    const entries =
      index.entries instanceof Map ? index.entries : new Map(index.entries);
    for (const [key, entry] of entries) {
      files.set(key, LimitCache.projectEntry(entry, segmentsMap));
    }
    return files;
  }

  static projectEntry(entry, segmentsMap) {
    if (entry.kind === 'shared') {
      const { segmentId, offset, length } = entry;
      if (length === 0) {
        return { data: Buffer.alloc(0), stat: entry.stat };
      }
      const sab = segmentsMap.get(segmentId);
      const data = Buffer.from(sab, offset, length);
      return { data, stat: entry.stat };
    }
    return { data: null, stat: entry.stat, path: entry.path };
  }
}

module.exports = { LimitCache };
