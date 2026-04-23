'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { Static } = require('../lib/static.js');
const { LimitCache } = require('../lib/cache/LimitCache.js');
const { PerFileCache } = require('../lib/cache/PerFileCache.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

// --- LimitCache (limit backend) ---

test('LimitCache - should load files into segments', async () => {
  const seg = 1024;
  const options = { limit: seg, maxFileSize: seg, baseSegmentSize: seg };
  const cache = new LimitCache(options);
  const filesMap = new Map();
  const data = Buffer.from('hello world');
  const stat = { size: data.byteLength };
  filesMap.set('/test.js', { data, stat, path: '/test.js' });
  await cache.load('static', filesMap);
  const index = cache.indexes.static;
  assert.ok(index);
  const entry = index.entries.get('/test.js');
  assert.strictEqual(entry.kind, 'shared');
  assert.strictEqual(entry.length, data.byteLength);
});

test('LimitCache - project creates Buffer view', async () => {
  const seg = 1024;
  const options = { limit: seg, maxFileSize: seg, baseSegmentSize: seg };
  const cache = new LimitCache(options);
  const data = Buffer.from('test data');
  const stat = { size: data.byteLength };
  const filesMap = new Map([['/f.js', { data, stat, path: '/f.js' }]]);
  await cache.load('static', filesMap);
  const snap = cache.snapshot();
  const segmentsMap = new Map();
  for (const seg of snap.segments) segmentsMap.set(seg.id, seg.sab);
  const files = LimitCache.project(snap.indexes.static, segmentsMap);
  const file = files.get('/f.js');
  assert.ok(file.data instanceof Buffer);
  assert.deepStrictEqual(file.data, data);
  assert.strictEqual(file.stat, stat);
});

test('LimitCache - zero-byte files stay shared without segments', async () => {
  const seg = 1024;
  const options = { limit: seg, maxFileSize: seg, baseSegmentSize: seg };
  const cache = new LimitCache(options);
  const stat = { size: 0 };
  const filesMap = new Map([['/empty.txt', { data: Buffer.alloc(0), stat, path: '/empty.txt' }]]);
  await cache.load('static', filesMap);
  const entry = cache.indexes.static.entries.get('/empty.txt');
  assert.deepStrictEqual(entry, {
    kind: 'shared',
    segmentId: 0,
    offset: 0,
    length: 0,
    stat,
  });
  const snapshot = cache.snapshot();
  assert.deepStrictEqual(snapshot.segments, []);
});

test('LimitCache - projectEntry returns empty Buffer for zero-byte files', () => {
  const stat = { size: 0 };
  const file = LimitCache.projectEntry(
    { kind: 'shared', segmentId: 0, offset: 0, length: 0, stat },
    new Map(),
  );
  assert.ok(file.data instanceof Buffer);
  assert.strictEqual(file.data.length, 0);
  assert.strictEqual(file.stat, stat);
});

// --- PerFileCache (per-file backend) ---

test('PerFileCache - should load files into individual SABs', async () => {
  const cache = new LimitCache({ limit: 1024, maxFileSize: 10 });
  const data = Buffer.alloc(20);
  const stat = { size: 20 };
  const filePath = '/tmp/big.bin';
  const file = { data, stat, path: filePath };
  const fm = new Map([['/big.bin', file]]);
  await cache.load('static', fm);
  const entry = cache.indexes.static.entries.get('/big.bin');
  assert.strictEqual(entry.kind, 'disk');
  assert.strictEqual(entry.data, null);
});

test('LimitCache - disk fallback for oversized files', async () => {
  const cache = new PerFileCache({ maxFileSize: 1024 * 1024 });
  const data = Buffer.from('hello world');
  const stat = { size: data.byteLength };
  const filesMap = new Map([['/test.js', { data, stat, path: '/test.js' }]]);
  await cache.load('static', filesMap);
  const entry = cache.indexes.static.entries.get('/test.js');
  assert.strictEqual(entry.kind, 'shared');
  assert.ok(entry.sab instanceof SharedArrayBuffer);
  assert.strictEqual(entry.length, data.byteLength);
});

test('PerFileCache - project creates Buffer view over SAB', async () => {
  const cache = new PerFileCache({ maxFileSize: 1024 * 1024 });
  const data = Buffer.from('test data');
  const stat = { size: data.byteLength };
  const filesMap = new Map([['/f.js', { data, stat, path: '/f.js' }]]);
  await cache.load('static', filesMap);
  const snap = cache.snapshot();
  assert.strictEqual(snap.segments, null);
  const files = PerFileCache.project(snap.indexes.static);
  const file = files.get('/f.js');
  assert.ok(file.data instanceof Buffer);
  assert.deepStrictEqual(file.data, data);
});

test('PerFileCache - disk fallback for oversized', async () => {
  const cache = new PerFileCache({ maxFileSize: 10 });
  const data = Buffer.alloc(20);
  const stat = { size: 20 };
  const filePath = '/tmp/big.bin';
  const file = { data, stat, path: filePath };
  const fm = new Map([['/big.bin', file]]);
  await cache.load('static', fm);
  const entry = cache.indexes.static.entries.get('/big.bin');
  assert.strictEqual(entry.kind, 'disk');
});

test('PerFileCache - free and compact are no-ops', () => {
  const cache = new PerFileCache();
  cache.free({ kind: 'shared', sab: new SharedArrayBuffer(4), length: 4 });
  assert.strictEqual(cache.compact(), null);
});

// --- Static (worker side) ---

test('Static setFiles - populate from projected entries', () => {
  const st = new Static('lib', application);
  const data = Buffer.from('hello world');
  const stat = { size: data.byteLength };
  const files = new Map([['/index.html', { data, stat }]]);
  st.setFiles(files);
  assert.strictEqual(st.files.size, 1);
  const file = st.get('/index.html');
  assert.ok(file.data instanceof Buffer);
  assert.deepStrictEqual(file.data, data);
});

test('Static updateFiles - updates entries', () => {
  const st = new Static('lib', application);
  const data1 = Buffer.from('version 1');
  const stat1 = { size: data1.byteLength };
  st.setFiles(new Map([['/f.js', { data: data1, stat: stat1 }]]));
  const data2 = Buffer.from('version 2 updated');
  const stat2 = { size: data2.byteLength };
  st.updateFiles(new Map([['/f.js', { data: data2, stat: stat2 }]]));
  const file = st.get('/f.js');
  assert.deepStrictEqual(file.data, data2);
});

test('Static deleteFiles - removes entries by keys', () => {
  const st = new Static('lib', application);
  const sab = new SharedArrayBuffer(4);
  new Uint8Array(sab).set([1, 2, 3, 4]);
  const data = Buffer.from(sab, 0, 4);
  const stat = { size: 4 };
  st.setFiles(
    new Map([
      ['/a.js', { data, stat }],
      ['/b.js', { data, stat }],
    ]),
  );
  assert.strictEqual(st.files.size, 2);
  st.deleteFiles(['/a.js']);
  assert.strictEqual(st.files.size, 1);
  assert.strictEqual(st.get('/a.js'), undefined);
  assert.ok(st.get('/b.js'));
});

test('Static - disk entry has null data', () => {
  const st = new Static('lib', application);
  const stat = { size: 20000000 };
  st.setFiles(new Map([['/big.bin', { data: null, stat, path: '/big.bin' }]]));
  const file = st.get('/big.bin');
  assert.strictEqual(file.data, null);
  assert.strictEqual(file.stat.size, 20000000);
});

test('Static - SAB data is zero-copy view', () => {
  const sab = new SharedArrayBuffer(5);
  new Uint8Array(sab).set([10, 20, 30, 40, 50]);
  const data = Buffer.from(sab, 0, 5);
  const stat = { size: 5 };
  const st = new Static('lib', application);
  st.setFiles(new Map([['/f.bin', { data, stat }]]));
  const file = st.get('/f.bin');
  assert.strictEqual(file.data.buffer, sab);
});

test('Static setFiles clears previous entries', () => {
  const st = new Static('lib', application);
  const data = Buffer.from([1, 2]);
  const stat = { size: 2 };
  st.setFiles(new Map([['/old.js', { data, stat }]]));
  assert.strictEqual(st.files.size, 1);
  st.setFiles(new Map([['/new.js', { data, stat }]]));
  assert.strictEqual(st.files.size, 1);
  assert.strictEqual(st.get('/old.js'), undefined);
  assert.ok(st.get('/new.js'));
});
