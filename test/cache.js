'use strict';

const path = require('path');
const metatests = require('metatests');
const { Cache } = require('../lib/cache.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

metatests.testAsync('lib/cache load', async (test) => {
  const cache = new Cache('cache', application);
  await cache.load();
  test.strictSame(cache.tree.utils.UNITS.length, 9);
  test.end();
});
