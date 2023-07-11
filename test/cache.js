'use strict';

const path = require('node:path');
const metatests = require('metatests');
const { Cache } = require('../lib/cache.js');

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

metatests.testAsync('lib/cache', async (test) => {
  test.plan(17);

  test.strictSame(typeof Cache, 'function');
  test.strictSame(Cache.name, 'Cache');

  class EmptyCache extends Cache {
    constructor(place, application) {
      super(place, application);
      this.empty = true;
    }

    async change(filePath) {
      test.strictSame(this.constructor.name, 'EmptyCache');
      test.strictSame(typeof filePath, 'string');
    }
  }

  const cache = new EmptyCache('cache', application);
  await cache.load();
  test.strictSame(cache.place, 'cache');
  test.strictSame(cache.empty, true);
});
