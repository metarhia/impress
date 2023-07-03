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
  const cache = new Static('cache', application);
  await cache.load();
  test.strictSame(cache.get('/example/add.js').length, 158);
  test.end();
});
