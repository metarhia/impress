'use strict';

const path = require('node:path');
const metatests = require('metatests');
const { Static } = require('../lib/static.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

metatests.testAsync('lib/static load', async (test) => {
  const cache = new Static('lib', application);
  test.strictSame(cache.files instanceof Map, true);
  test.strictSame(cache.files.size, 0);
  test.strictSame(cache.ext, undefined);
  test.strictSame(cache.maxFileSize, -1);
  test.strictSame(cache.get('/example/add.js'), undefined);
  await cache.load();
  test.strictSame(cache.files.size, 13);
  test.strictSame(cache.get('/example/add.js') instanceof Buffer, true);
  test.strictSame(cache.get('/example/add.js').length, 158);
  test.strictSame(cache.get('/example/unknown.js'), undefined);
  test.strictSame(cache.ext, undefined);
  test.strictSame(cache.maxFileSize, 10000000);
  test.end();
});
