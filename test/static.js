'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
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

test('lib/static load - should load static files correctly', async () => {
  const cache = new Static('lib', application);
  assert.strictEqual(cache.files instanceof Map, true);
  assert.strictEqual(cache.files.size, 0);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, -1);
  assert.strictEqual(cache.get('/example/add.js'), undefined);

  await cache.load();
  assert.strictEqual(cache.files.size, 13);
  const file = cache.get('/example/add.js');
  assert.strictEqual(file.data instanceof Buffer, true);
  assert.strictEqual(file.data.length, 158);
  assert.strictEqual(cache.get('/example/unknown.js'), undefined);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, 10000000);
});

test('lib/static load - should compress correctly by gzip', async () => {
  const cache = new Static('lib', application, { compressType: 'gzip' });
  assert.strictEqual(cache.files instanceof Map, true);
  assert.strictEqual(cache.files.size, 0);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, -1);
  assert.strictEqual(cache.get('/example/add.js'), undefined);

  await cache.load();
  assert.strictEqual(cache.files.size, 13);
  const file = cache.get('/example/add.js');
  assert.strictEqual(file.data instanceof Buffer, true);
  assert.strictEqual(file.data.length, 116);
  assert.strictEqual(cache.get('/example/unknown.js'), undefined);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, 10000000);
});

test('lib/static load - should compress correctly by deflate', async () => {
  const cache = new Static('lib', application, {
    compressType: 'deflate',
  });
  assert.strictEqual(cache.files instanceof Map, true);
  assert.strictEqual(cache.files.size, 0);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, -1);
  assert.strictEqual(cache.get('/example/add.js'), undefined);

  await cache.load();
  assert.strictEqual(cache.files.size, 13);
  const file = cache.get('/example/add.js');
  assert.strictEqual(file.data instanceof Buffer, true);
  assert.strictEqual(file.data.length, 104);
  assert.strictEqual(cache.get('/example/unknown.js'), undefined);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, 10000000);
});

test('lib/static load - should compress correctly by brotli', async () => {
  const cache = new Static('lib', application, {
    compressType: 'br',
  });
  assert.strictEqual(cache.files instanceof Map, true);
  assert.strictEqual(cache.files.size, 0);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, -1);
  assert.strictEqual(cache.get('/example/add.js'), undefined);

  await cache.load();
  assert.strictEqual(cache.files.size, 13);
  const file = cache.get('/example/add.js');
  assert.strictEqual(file.data instanceof Buffer, true);
  assert.strictEqual(file.data.length, 100);
  assert.strictEqual(cache.get('/example/unknown.js'), undefined);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, 10000000);
});

test('lib/static load - should compress correctly by zstd', async () => {
  const cache = new Static('lib', application, {
    compressType: 'zstd',
  });
  assert.strictEqual(cache.files instanceof Map, true);
  assert.strictEqual(cache.files.size, 0);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, -1);
  assert.strictEqual(cache.get('/example/add.js'), undefined);

  await cache.load();
  assert.strictEqual(cache.files.size, 13);
  const file = cache.get('/example/add.js');
  assert.strictEqual(file.data instanceof Buffer, true);
  assert.strictEqual(file.data.length, 109);
  assert.strictEqual(cache.get('/example/unknown.js'), undefined);
  assert.strictEqual(cache.ext, undefined);
  assert.strictEqual(cache.maxFileSize, 10000000);
});

test('lib/static - should throw error on unsupported compression', async () => {
  assert.throws(() => {
    new Static('lib', application, {
      compressType: 'unsupported',
    });
  }, new Error('Unsupported compression type unsupported'));
});
