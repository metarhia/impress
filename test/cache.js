'use strict';

const path = require('path');
const metatests = require('metatests');
const { Cache } = require('../lib/cache.js');

const root = process.cwd();
const cachePath = path.join(root, 'test/cache');

metatests.testAsync('lib/cache load', async (test) => {
  const cache = new Cache(cachePath);
  cache.load();
  test.strictSame(cache.path, cachePath);
  test.strictSame(typeof cache.tree, 'object');
  test.end();
});
