'use strict';

const path = require('node:path');
const metatests = require('metatests');
const { Place } = require('../lib/place.js');

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

metatests.testAsync('lib/place', async (test) => {
  const cache = new Place('cache', application);
  await cache.load();
  test.strictSame(cache.tree.utils.UNITS.length, 9);
  test.end();
});
