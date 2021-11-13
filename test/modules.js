'use strict';

const path = require('path');
const metatests = require('metatests');
const { Modules } = require('../lib/modules.js');

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

metatests.testAsync('lib/modules load', async (test) => {
  const cache = new Modules('cache', application);
  await cache.load();
  test.strictSame(cache.tree.utils.UNITS.length, 9);
  console.dir({ cache }, { depth: 10 });
  test.end();
});
