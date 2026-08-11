'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const zlib = require('node:zlib');
const path = require('node:path');

const { Static } = require('../lib/static.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

const assertEmptyCache = (cache) => {
  assert.strictEqual(cache.files instanceof Map, true);
  assert.strictEqual(cache.files.size, 0);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, -1);
  assert.strictEqual(cache.get('/example/add.js'), undefined);
};

const assertLoadedFile = async (cache, expectedLength) => {
  await cache.load();
  assert.strictEqual(cache.files.size, 13);
  const file = cache.get('/example/add.js');
  assert.strictEqual(file.data instanceof Buffer, true);
  assert.strictEqual(file.data.length, expectedLength);
  assert.strictEqual(cache.get('/example/unknown.js'), undefined);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, 10000000);
};

test('lib/static load - should load static files correctly', async () => {
  const cache = new Static('lib', application);
  assertEmptyCache(cache);
  await assertLoadedFile(cache, 158);
});

test('lib/static load - should compress correctly by gzip', async () => {
  const cache = new Static('lib', application, { compressType: 'gzip' });
  assertEmptyCache(cache);
  await assertLoadedFile(cache, 116);
});

test('lib/static load - should compress correctly by deflate', async () => {
  const cache = new Static('lib', application, {
    compressType: 'deflate',
  });
  assertEmptyCache(cache);
  await assertLoadedFile(cache, 104);
});

test('lib/static load - should compress correctly by brotli', async () => {
  const cache = new Static('lib', application, {
    compressType: 'br',
  });
  assertEmptyCache(cache);
  await assertLoadedFile(cache, 100);
});

if (zlib.zstdCompress) {
  test('lib/static load - should compress correctly by zstd', async () => {
    const cache = new Static('lib', application, {
      compressType: 'zstd',
    });
    assertEmptyCache(cache);
    await assertLoadedFile(cache, 109);
  });
}

test('lib/static - should throw error on unsupported compression', async () => {
  assert.throws(() => {
    new Static('lib', application, {
      compressType: 'unsupported',
    });
  }, new Error('Unsupported compression type unsupported'));
});
