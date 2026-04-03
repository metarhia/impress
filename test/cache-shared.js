'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { Static } = require('../lib/static.js');
const { StaticCache } = require('../lib/cache.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

// --- StaticCache (main process) ---

test('StaticCache - should load files into SAB', async () => {
  const appPath = path.join(root, 'test');
  const cache = new StaticCache(appPath, {});
  const entries = await cache.loadPlace('lib');
  assert.ok(entries.length > 0);
  const entry = entries.find((e) => e.key.includes('add.js'));
  assert.ok(entry);
  assert.ok(entry.sab instanceof SharedArrayBuffer);
  assert.strictEqual(entry.byteLength, entry.sab.byteLength);
  const data = Buffer.from(entry.sab, 0, entry.byteLength);
  assert.ok(data.length > 0);
});

test('StaticCache - entries have correct structure', async () => {
  const appPath = path.join(root, 'test');
  const cache = new StaticCache(appPath, {});
  const entries = await cache.loadPlace('lib');
  for (const entry of entries) {
    assert.strictEqual(typeof entry.key, 'string');
    assert.ok(entry.key.startsWith('/'));
    assert.strictEqual(typeof entry.byteLength, 'number');
    assert.strictEqual(typeof entry.size, 'number');
    if (entry.sab) {
      assert.ok(entry.sab instanceof SharedArrayBuffer);
    }
  }
});

test('StaticCache.getPlaceEntries - returns entries', async () => {
  const appPath = path.join(root, 'test');
  const cache = new StaticCache(appPath, {});
  await cache.loadPlace('lib');
  const entries = StaticCache.getPlaceEntries(cache, 'lib');
  assert.ok(entries.length > 0);
  const missing = StaticCache.getPlaceEntries(cache, 'none');
  assert.strictEqual(missing.length, 0);
});

// --- Static (worker side) ---

test('Static initCache - populate from SAB entries', () => {
  const cache = new Static('lib', application);
  const content = Buffer.from('hello world');
  const sab = new SharedArrayBuffer(content.byteLength);
  new Uint8Array(sab).set(content);
  cache.initCache([
    {
      key: '/index.html',
      sab,
      byteLength: content.byteLength,
      size: content.byteLength,
    },
  ]);
  assert.strictEqual(cache.files.size, 1);
  const file = cache.get('/index.html');
  assert.ok(file.data instanceof Buffer);
  assert.strictEqual(file.data.length, content.byteLength);
  assert.deepStrictEqual(file.data, content);
  assert.ok(file.sab instanceof SharedArrayBuffer);
});

test('Static updateEntry - updates SAB entry', () => {
  const cache = new Static('lib', application);
  const sab1 = new SharedArrayBuffer(9);
  new Uint8Array(sab1).set(Buffer.from('version 1'));
  cache.initCache([{ key: '/f.js', sab: sab1, byteLength: 9, size: 9 }]);
  const content2 = Buffer.from('version 2 updated');
  const sab2 = new SharedArrayBuffer(content2.byteLength);
  new Uint8Array(sab2).set(content2);
  cache.updateEntry({
    key: '/f.js',
    sab: sab2,
    byteLength: content2.byteLength,
    size: content2.byteLength,
  });
  const file = cache.get('/f.js');
  assert.deepStrictEqual(file.data, content2);
});

test('Static deleteEntry - removes entry by key', () => {
  const cache = new Static('lib', application);
  const sab = new SharedArrayBuffer(4);
  new Uint8Array(sab).set([1, 2, 3, 4]);
  cache.initCache([
    { key: '/a.js', sab, byteLength: 4, size: 4 },
    { key: '/b.js', sab, byteLength: 4, size: 4 },
  ]);
  assert.strictEqual(cache.files.size, 2);
  cache.deleteEntry('/a.js');
  assert.strictEqual(cache.files.size, 1);
  assert.strictEqual(cache.get('/a.js'), undefined);
  assert.ok(cache.get('/b.js'));
});

test('Static withData - null sab has null data', () => {
  const cache = new Static('lib', application);
  cache.initCache([
    {
      key: '/big.bin',
      sab: null,
      byteLength: 0,
      size: 20000000,
    },
  ]);
  const file = cache.get('/big.bin');
  assert.strictEqual(file.data, null);
  assert.strictEqual(file.size, 20000000);
});

test('Static SAB data is zero-copy view', () => {
  const sab = new SharedArrayBuffer(5);
  new Uint8Array(sab).set([10, 20, 30, 40, 50]);
  const cache = new Static('lib', application);
  cache.initCache([{ key: '/f.bin', sab, byteLength: 5, size: 5 }]);
  const file = cache.get('/f.bin');
  assert.strictEqual(file.data.buffer, sab);
});

test('Static initCache clears previous entries', () => {
  const cache = new Static('lib', application);
  const sab = new SharedArrayBuffer(2);
  cache.initCache([{ key: '/old.js', sab, byteLength: 2, size: 2 }]);
  assert.strictEqual(cache.files.size, 1);
  cache.initCache([{ key: '/new.js', sab, byteLength: 2, size: 2 }]);
  assert.strictEqual(cache.files.size, 1);
  assert.strictEqual(cache.get('/old.js'), undefined);
  assert.ok(cache.get('/new.js'));
});
