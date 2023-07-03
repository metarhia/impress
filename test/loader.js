'use strict';

const path = require('node:path');
const metatests = require('metatests');
const { Loader } = require('../lib/loader.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  console,
  starts: [],
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

metatests.testAsync('lib/loader', async (test) => {
  const cache = new Loader('cache', application);
  await cache.load();
  test.strictSame(cache.tree.utils.UNITS.length, 9);
  test.end();
});
