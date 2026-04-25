# SharedArrayBuffer Cache in Impress

## Motivation

Impress uses `worker_threads` to handle HTTP requests. Each worker serves static files (HTML, CSS, JS, images, etc.). Without shared memory, every worker keeps its own copy of every file � with 8 workers and 100 MiB of static assets, total consumption reaches 800 MiB. SharedArrayBuffer stores all files in shared memory accessible to all threads.

## Benchmarks

Baseline: no SAB (per-worker file copies). Delta columns show improvement relative to baseline � positive values are better even for latency and memory metrics.

# Compare before-sab -> after-sab

| File | Metric | Before | After | Delta |
| --- | --- | ---: | ---: | ---: |
| bench-64k.bin | RPS | 1767.14 | 1759.49 | -0.43% |
| bench-64k.bin | Throughput MB/s | 111.16 | 110.67 | -0.44% |
| bench-64k.bin | p95 ms | 330.00 | 309.00 | +6.36% |

| bench-256k.bin | RPS | 507.04 | 507.04 | +0.00% |
| bench-256k.bin | Throughput MB/s | 126.97 | 126.97 | +0.00% |
| bench-256k.bin | p95 ms | 752.00 | 748.00 | +0.53% |

| bench-1m.bin | RPS | 127.80 | 128.63 | +0.65% |
| bench-1m.bin | Throughput MB/s | 127.84 | 128.71 | +0.68% |
| bench-1m.bin | p95 ms | 1976.00 | 1993.00 | -0.86% |

| bench-5m.bin | RPS | 83.12 | 114.00 | +37.15% |
| bench-5m.bin | Throughput MB/s | 415.72 | 570.22 | +37.16% |
| bench-5m.bin | p95 ms | 23172.00 | 13236.00 | +42.88% |

| bench-10m.bin | RPS | 79.60 | 92.00 | +15.58% |
| bench-10m.bin | Throughput MB/s | 759.08 | 877.44 | +15.59% |
| bench-10m.bin | p95 ms | 25680.00 | 22631.00 | +11.87% |

| System metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| CPU max % | 22.91 | 23.65 | -3.23% |
| Working set max MB | 5066.02 | 1210.59 | +76.10% |
| Private max MB | 5110.43 | 1358.33 | +73.42% |

## Architecture

The system is split into four modules behind one orchestrator:

| Module | Location | Purpose |
|--------|----------|---------|
| **SharedCache** | `lib/cache/SharedCache.js` | Orchestration: watcher, ACK tracking, compaction dispatch, broadcast |
| **FilesystemCache** | `lib/cache/FilesystemCache.js` | Slab allocator with pooled SAB segments, extent-based allocation, compaction |
| **PlacementSource** | `lib/cache/PlacementSource.js` | Filesystem scanner, returns `{ stat, path }` per file |

`SharedCache` owns the `FilesystemCache` instance and delegates all allocation, snapshot, projection, free, and compact operations to it.

`FilesystemCache` has no dependencies on Node.js built-ins. This allows it to be used in a browser or in tests without mocks.

## Limit mode: Slab Allocator

The memory management model follows the Linux SLUB allocator principle: SharedArrayBuffer segments are **never returned to the OS**. Instead, they go through a lifecycle:

```
-----------�     files deleted     -----------�     memory needed    -----------�
�  Active  � ------------------>   �  Clean   � ------------------>  �  Active  �
�  (data)  �                       �  (empty) �                      �  (data)  �
L-----------                       L-----------                       L-----------
```

**Why SABs are never freed:** V8 cannot reduce reserved virtual memory after a SharedArrayBuffer is deallocated. Recreating a SAB of the same size still allocates a new page. Retaining empty segments (`emptySegmentIds`) and reusing them completely eliminates allocation system calls.

### Internal classes in FilesystemCache.js

#### Pool

Manages the memory budget and the set of SAB segments.

```
Pool
+-- segments: Map<id, { id, sab }>   � all segments
+-- emptySegmentIds: Set<id>                — empty, ready for reuse
+-- limit: number                           � total budget (default 1 GiB)
+-- baseSegmentSize: number                 � segment size (default 64 MiB)
+-- totalUsed: number                       � total size of all SABs
�
+-- createBaseSegment()  � takes a clean segment or creates a new SAB
+-- freeSegment(id)    — marks an empty segment as clean
L-- getSegment(id)       � access by ID
```

Key detail: `baseSegmentSize = Math.ceil(maxFileSize / configured) * configured`. The segment size is rounded up to the nearest multiple of the configured value that can fit `maxFileSize`. For example, with `configured = 64 MiB` and `maxFileSize = 100 MiB`, the segment size becomes `128 MiB` (2 ? 64). When `maxFileSize` is smaller than `configured` (the typical case, e.g. `10 MB` and `64 MiB`), the segment size stays at `configured`. The `limit` must be evenly divisible by the effective segment size � otherwise the remainder is wasted. There are no dedicated segments � a single segment type serves all files.

#### SegmentRegistry

Extent-based allocator within base segments. Each segment is tracked via:

- **`partially: Map<segmentId, offset>`** � boundary of written data (high water mark)
- **`empty: Map<segmentId, Array<{ offset, length }>>`** � freed regions

`allocate(size, limitReached=false)` algorithm:

```
1. Best-fit search across free extents of all segments
   > found a match > return { segmentId, offset }
   > exact size match > remove the extent
   > larger than needed > shrink the extent

2. Tail-append: find a segment where tail + size ? baseSegmentSize
   > found > advance tail, return

3. New segment (if !limitReached):
   > pool.createBaseSegment() > registerSegment > tail = size
   > budget exhausted > return null (file becomes a disk entry)
```

With `limitReached=true` (used by compact), step 3 is skipped � data is only moved into existing segments.

`free()` inserts an extent into a sorted list and merges adjacent ones:

```
[100..200] + [200..300] > [100..300]   // merge right
[0..100]   + [100..300] > [0..300]     // merge left
```

### Entry types (limit mode)

**Shared entry** � file in SAB:
```js
{ kind: 'shared', segmentId, offset, length, stat }
```
Zero-byte files are shared entries with `segmentId: 0, offset: 0, length: 0` � no segment is allocated.

**Disk entry** � file on disk (size > maxFileSize, or budget exhausted):
```js
{ kind: 'disk', path, stat, data: null }
```

---


## File loading

### Initial load (main thread)

```
SharedCache.initialize()
  > for each placement:
      source.load()           // PlacementSource scans the directory
      cache.load(name, files) // Backend distributes files across SABs
```

If shared cache initialization fails (configuration, filesystem, or reader error), application startup is aborted � there is no fallback to per-worker static loading. Empty placements are valid: initialization succeeds with an empty index and zero allocated segments.

In limit mode, `load()` sorts files by descending size � large files are placed first, reducing fragmentation. For each file, `#allocateEntry()` is called:

1. `size > maxFileSize` > disk entry
2. No data and no reader > disk entry
3. `size === 0` > shared entry with `segmentId: 0, offset: 0, length: 0` (no segment allocated)
4. `registry.allocate(size)` > obtains `{ segmentId, offset }` � free space in a segment
5. `reader(path, sab, offset, size)` > reads the file from disk directly into SAB, bypassing the heap; if `data` is already in memory � copies via `Uint8Array.set(data)`


The reader is injected when SharedCache is created � it is `async (path, sab, offset, size) => void`. In Node.js it is implemented via `fh.read(Buffer.from(sab, offset, size))` � a Buffer view is created over the SharedArrayBuffer region, and `fs` writes data directly there.

### Delivery to workers

```
workerData.sharedCache = cache.snapshot()
```

Limit mode snapshot:
```js
{ segments: [{ id, sab }, ...], filesystems: { placement: { entries: [...] } } }
```


SharedArrayBuffer is passed via `workerData` � V8 transfers only a reference, no data copying occurs.

## Worker-side projection

```js
const { FilesystemCache } = require('./cache/FilesystemCache.js');
const segmentsMap = new Map();
for (const seg of sharedCache.segments) segmentsMap.set(seg.id, seg.sab);
const projectEntry = (entry) => FilesystemCache.projectEntry(entry, segmentsMap);
```

ACK:

```js
const sendAck = (updateId) => parentPort.postMessage({ name: 'ack-update', updateId });
```


### Limit mode projection

Each shared entry is projected into an object with an eager Buffer view:

```js
{ data: Buffer.from(segmentsMap.get(segmentId), offset, length), stat }
```

Zero-byte entries (`length === 0`) are projected as `{ data: Buffer.alloc(0), stat }` without consulting `segmentsMap`. `free()` also skips zero-byte entries � they hold no segment allocation.

`Buffer.from(sab, offset, length)` creates a lightweight view (~64 bytes descriptor) over the SAB region � no data copy. The view is created once at projection time. Since segments are never freed (slab retention), SAB references in `segmentsMap` live for the entire process lifetime. When a file is removed via `deleteFiles`, the projected object loses its last reference and is GC'd along with the Buffer view. Stale data in the segment is overwritten upon reuse.


### Common

Disk entries in both modes are projected as `{ data: null, stat, path }`.

## Hot-reload: epoch-based delta updates

metawatch debounces filesystem events, collecting them into a batch during a quiet period. SharedCache uses **epoch coalescing** on top of this: all changes and deletions in a single metawatch batch are collected into one epoch, then flushed as minimal broadcasts.

Routing from a filesystem event to a placement is done by the first path segment relative to application root, not by absolute-path prefix matching. This avoids collisions such as `static` vs `static2`.

```
metawatch                        SharedCache
    �                                �
    +-- debounce fs.watch events     �
    +-- 'before' ------------------> epoch = { updates, deletes, oldEntries }
    +-- 'change' file1 ----------->  push processChange() promise
    +-- 'change' file2 ----------->  push processChange() promise
    +-- 'delete' file3 ----------->  processDelete() (sync)
    +-- 'after' -------------------> Promise.all > flushEpoch()
```

`#flushEpoch` delegates to `#flushEpochWithAck`.

### Limit mode flush

Sends at most `2 ? placements` messages (one `file-update` and one `file-delete` per placement), each carrying an `updateId`. All old entries are tracked against the **last** `updateId` � since `worker_threads` guarantees FIFO ordering, an ACK for the last message implies all prior messages have been processed.

```
flushEpochWithAck:
  1 file-update per placement (entries + newSegments + updateId)
  1 file-delete per placement (keys + updateId)
  trackUpdate(lastUpdateId, all old entries)
```

1000 file changes > 1 broadcast with 1000 entries > N workers receive 1 message > N ACKs > 1 free cycle.

### ACK protocol (limit mode only)

Old entries are not freed immediately � a worker may be reading data at the moment of an update. Protocol:

```
Main thread                          Workers
    �                                    �
    +-- file-update (updateId=5) ----->  �
    +-- file-delete (updateId=6) ----->  �
    �                                    +-- apply update, ack 5
    �   <-------------------- ack 5 (ignored, not tracked)
    �                                    +-- apply delete, ack 6
    �   <-------------------- ack 6 -----+
    �   ... all workers acked 6 ...       �
    +-- free(all oldEntries)             �
    +-- tryCompact()                     �
    L-------------------------------------
```

If a worker crashes, the `worker.exit` event triggers `sharedCache.handleWorkerExit(id)`, which immediately removes the worker from all pending ACK sets. If it was the last expected worker, `free` is called right away. The new worker is restarted and receives a fresh `snapshot()`.

There is no timeout-based forced free � a live worker will always eventually process its message queue and send an ACK. Forced free of a slow-but-alive worker would risk data corruption: the freed extent could be reused by another file while the worker's Buffer view still points to it.

## Compaction (limit mode only)

After entries are freed, `compact(threshold=0.3)` is called:

1. Finds the base segment with the lowest utilization below `threshold`
2. Requires at least 2 base segments (a single segment has nowhere to compact to)
3. Attempts to move all files from the target segment into others (via `allocate(size, limitReached=true)`)
4. On success � updates indexes, groups moved files by placement, sends one `file-update` per affected placement, and tracks all `oldEntries` against the **last** `updateId` of the compaction batch
5. On failure � full rollback: restores extents and tail of the target segment

Compaction uses the same batch-first ACK rule as epoch flush: workers may receive several `file-update` messages from one compaction, but memory is released only after the ACK for the last message in that batch.

After compaction, the emptied segment automatically enters `emptySegmentIds` through the normal `free > freeSegment` cycle.

```
Before compaction:

Segment 1: [fileA][____][fileB][________]  utilization 20%
Segment 2: [fileC][fileD][______________]  utilization 60%

After:

Segment 1: > clean (empty, ready for reuse)
Segment 2: [fileC][fileD][fileA][fileB][_]  utilization 80%
```

## Serving (lib/static.js)

`Static` is the worker-side serving layer. Each shared-cache placement creates a `Static` instance that holds projected `files` and handles HTTP responses.

### Initialization

`initServing(config)` is called after projection. It reads two config options:

- **`streamThreshold`** � file size above which responses are streamed rather than written as a single buffer. Default: `'1 mb'`. Accepts any size unit (`sizeToBytes`).
- **`virtualFS`** � enables recursive virtual filesystem resolution. Default: `false`.

When `virtualFS` is **off** (default):
- `search` = `lookup()` � exact match + `index.html` for directory paths
- `errorPage` � generates a minimal HTML page (`<h1>404 Not Found</h1>`)

When `virtualFS` is **on**:
- `search` = `find()` � walks up the directory tree looking for `index.html`, `.virtual.html`, `.{code}.html`
- `errorPage` � searches for custom error pages (`.404.html`, `.416.html`) in the file tree

### Serve flow

```
serve(url, transport)
  �
  +- 1. Fast exact-hit (file has data + stat, not internal)
  �     +-- Range request? > validate > stream or subarray > 206
  �     +-- size > streamThreshold? > createSABStream() > 200
  �     L-- small file > transport.write(data) > 200
  �
  +- 2. Recursive search via lookup() or find()
  �     +-- file with data + stat (e.g. index.html via directory path) > write directly
  �     L-- file with data only (status/virtual pages) > write directly
  �         Range and streaming intentionally omitted � always small HTML files
  �
  +- 3. Disk fallback (uncached or oversized)
  �     +-- Range request? > validate > fs.createReadStream(options) > 206
  �     L-- fs.createReadStream() > 200
  �
  L- 4. 404
```

### SAB streaming

When a cached file exceeds `streamThreshold`, it is sent via `createSABStream()` which reads 64 KiB chunks from the SAB Buffer view. This applies to both full responses and range requests. Files below the threshold are written as a single buffer (or `subarray` for ranges).

### Range requests

Supported in the exact-hit and disk fallback paths:
- Valid range > 206 Partial Content (stream or subarray depending on size vs threshold)
- Invalid range (`start >= end`, `start >= size`, `end >= size`) > 416 Range Not Satisfiable

Range requests reaching the recursive search path (step 2) are ignored by design � those paths resolve only small HTML files that are always served in full.

### Disk fallback

Files with `data: null` (oversized or budget-exhausted) are served from disk via `fs.createReadStream()`, with range support via `start`/`end` options.

## Configuration

```js
// config/cache.js
({
  maxFileSize: '10 mb',        // files larger than this > disk entry
  streamThreshold: '1 mb',    // files larger than this > streamed in chunks (default '1 mb')
  virtualFS: false,            // enable recursive virtual FS resolution (default false)
  placements: [
    { name: 'static' },
    { name: 'resources' },
    { name: 'assets', ext: ['.png', '.jpg', '.woff2'] },
  ],
  // Limit mode (slab allocator options):
  sab: {
    limit: '1 gib',           // total SAB budget (must be divisible by segment size)
    baseSegmentSize: '64 mib', // single segment size (must be ? maxFileSize)
  },
});
```

All size values support both binary (KiB, MiB, GiB) and decimal (KB, MB, GB) units.

The entire `cache` section is optional � when absent, all defaults apply (`mode: 'limit'`, `maxFileSize: '10 mb'`, `streamThreshold: '1 mb'`, `virtualFS: false`, `sab.limit: '1 gib'`, `sab.baseSegmentSize: '64 mib'`, placements: `static` + `resources`).

**Important (limit mode):** `limit` must be evenly divisible by the effective `baseSegmentSize`. Otherwise the remainder is wasted � Pool cannot create a segment smaller than `baseSegmentSize`. The effective segment size is `Math.ceil(maxFileSize / configured) * configured`.

## Safety invariants

**Common (both modes):**
- Workers **never write** to SharedArrayBuffer
- All worker Buffer views are zero-copy descriptors over shared memory

**Limit mode:**
- Old memory is freed **only after ACK** from all workers or worker exit
- SAB references in worker `segmentsMap` live for the entire process lifetime (slab retention)
- All worker Buffer views reference SABs from a **single** `segmentsMap` (not a copy)
- SAB segments are **never returned to the OS** � only reused
- Total memory usage is always ? `limit`

## Patterns and influences

The cache design draws on several well-known systems patterns:

- **SLUB slab allocator** (Linux kernel) � segments are never returned to the OS; empty segments are marked clean and reused, eliminating allocation system calls (limit mode)
- **Extent-based allocation** (ext4, XFS) � free space tracked as `{ offset, length }` extents with best-fit search and adjacent merge on free (limit mode)
- **Event coalescing / group commit** (PostgreSQL WAL, Nagle's algorithm) � metawatch debounces fs events into batches, SharedCache coalesces each batch into minimal broadcasts via epoch flush (both modes)
- **Copy-on-write update** (MVCC) � file updates allocate a new extent, old data lives until all workers ACK; readers never see partial writes (limit mode)
- **Dependency injection** � LimitCache accepts an injectable `reader` function, keeping it free of Node.js built-in dependencies for cross-platform use

## Data flow diagram

```
                    -----------------------------------�
                    �           Main Thread             �
                    �                                   �
                    �  SharedCache (orchestrator)        �
                    �   +-- FilesystemCache               �
                    �   �    +-- Pool                    �
                    �   �    �    L-- SAB segments       �
                    �   �    L-- SegmentRegistry                �
                    �   �         L-- extents/tails      �
                    �   +-- PlacementSource[]               �
                    �   L-- Watcher                      �
                    L----------T------------------------
                               �
                    snapshot / file-update / file-delete
                               �
            -------------------+------------------�
            �                  �                  �
     --------------�   --------------�   --------------�
     �  Worker 1   �   �  Worker 2   �   �  Worker N   �
     �             �   �             �   �             �
     � mode detect �   � mode detect �   � mode detect �
     � project()   �   � project()   �   � project()   �
     �             �   �             �   �             �
     � place.files �   � place.files �   � place.files �
     � (views)     �   � (views)     �   � (views)     �
     L--------------   L--------------   L--------------
            �                  �                  �
            L---- Buffer.from(sab, ...) -----------
                   zero-copy data access
```

## Integration Guide

The cache module (`lib/cache/`) is self-contained: it depends only on `metawatch` and `metautil` from the Metarhia ecosystem and has no knowledge of the application framework structure or worker lifecycle.

### Install dependencies

```sh
npm install metawatch metautil
```

### Create and initialize SharedCache

```js
const { SharedCache } = require('./lib/cache/SharedCache.js');
const { Worker } = require('node:worker_threads');

// threads Map must be created before SharedCache so the closures capture it
const threads = new Map();

const cache = new SharedCache({
  // SAB budget — all optional, defaults shown
  limit: '1 gib',
  baseSegmentSize: '64 mib',
  maxFileSize: '10 mb',

  // DirectoryWatcher debounce timeout, ms — optional
  watchTimeout: 2000,

  // Directories to serve under `dir` — optional, default: static + resources
  placements: [
    { name: 'static' },
    { name: 'resources' },
    { name: 'assets', ext: ['.png', '.jpg', '.woff2'] },
  ],

  // Application root directory (placements live here)
  dir: '/path/to/app',

  // Console-compatible logger
  console,

  // Called once per message batch to all active workers
  broadcast: (data) => {
    for (const thread of threads.values()) thread.postMessage(data);
  },

  // Returns iterable of active worker IDs (used to track pending ACKs)
  getWorkerIds: () => threads.keys(),
});

await cache.initialize(); // scan placements, load files into SAB
cache.watch();            // start filesystem watcher
```

### Deliver snapshot to a new worker

Pass the snapshot in `workerData` before creating the worker. The snapshot contains SAB references — V8 transfers only descriptors, no data is copied.

```js
const workerData = {
  sharedCache: cache.snapshot(),
  // ... other workerData fields
};
const worker = new Worker(workerPath, { workerData });
threads.set(workerId, worker);

worker.on('message', (msg) => {
  if (msg.name === 'ack-update') cache.handleAck(msg.updateId, workerId);
});

worker.on('exit', () => {
  cache.handleWorkerExit(workerId);
  threads.delete(workerId);
});
```

### Worker side

```js
const { workerData, parentPort } = require('node:worker_threads');
const { FilesystemCache } = require('./cache/FilesystemCache.js');

const { sharedCache } = workerData;

// Build segment map from initial snapshot
const segmentsMap = new Map();
for (const seg of sharedCache.segments) segmentsMap.set(seg.id, seg.sab);

// Project a placement into a files Map (key -> { data: Buffer|null, stat, path? })
const files = FilesystemCache.project(sharedCache.filesystems['static'], segmentsMap);

// Send ACK after applying each update
const sendAck = (updateId) =>
  parentPort.postMessage({ name: 'ack-update', updateId });

// Handle delta messages from main thread
parentPort.on('message', (msg) => {
  if (msg.name === 'file-update') {
    // Register new segments before projecting entries
    for (const seg of msg.newSegments) segmentsMap.set(seg.id, seg.sab);
    for (const [key, entry] of msg.updates) {
      files.set(key, FilesystemCache.projectEntry(entry, segmentsMap));
    }
    sendAck(msg.updateId);
  } else if (msg.name === 'file-delete') {
    for (const key of msg.keys) files.delete(key);
    sendAck(msg.updateId);
  }
});
```

### Message protocol reference

| Message (main → worker) | Fields | Notes |
|---|---|---|
| `file-update` | `target`, `updateId`, `updates: [[key, entry], ...]`, `newSegments: [{id, sab}]` | Apply entries then ACK |
| `file-delete` | `target`, `updateId`, `keys: [string]` | Delete keys then ACK |

| Message (worker → main) | Fields | Notes |
|---|---|---|
| `ack-update` | `updateId` | Sent after applying any message with `updateId` |
