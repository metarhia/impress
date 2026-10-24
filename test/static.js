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

const CASES = [
  { name: 'should load static files correctly', length: 158 },
  {
    name: 'should compress correctly by gzip',
    compressType: 'gzip',
    length: 116,
  },
  {
    name: 'should compress correctly by deflate',
    compressType: 'deflate',
    length: 104,
  },
  {
    name: 'should compress correctly by brotli',
    compressType: 'br',
    length: 100,
  },
  {
    name: 'should compress correctly by zstd',
    compressType: 'zstd',
    length: 109,
  },
];

for (const { name, compressType, length } of CASES) {
  if (compressType === 'zstd' && !zlib.zstdCompress) continue;
  test(`lib/static load - ${name}`, async () => {
    const cache = new Static('lib', application, { compressType });
    assert.strictEqual(cache.files instanceof Map, true);
    assert.strictEqual(cache.files.size, 0);
    assert.strictEqual(cache.ext, undefined);
    assert.strictEqual(cache.maxFileSize, -1);
    assert.strictEqual(cache.get('/example/add.js'), undefined);

    await cache.load();
    assert.strictEqual(cache.files.size, 13);
    const file = cache.get('/example/add.js');
    assert.strictEqual(file.data instanceof Buffer, true);
    assert.strictEqual(file.data.length, length);
    assert.strictEqual(cache.get('/example/unknown.js'), undefined);
    assert.strictEqual(cache.ext, undefined);
    assert.strictEqual(cache.maxFileSize, 10000000);
  });
}

test('lib/static - should throw error on unsupported compression', async () => {
  assert.throws(() => {
    new Static('lib', application, {
      compressType: 'unsupported',
    });
  }, new Error('Unsupported compression type unsupported'));
});
