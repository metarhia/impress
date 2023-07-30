'use strict';

const path = require('node:path');
const metatests = require('metatests');
const { Code } = require('../lib/code.js');

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

metatests.testAsync('lib/code', async (test) => {
  const cache = new Code('cache', application);
  test.strictSame(cache.place, 'cache');
  test.strictSame(typeof cache.path, 'string');
  test.strictSame(typeof cache.application, 'object');
  test.strictSame(cache.tree, {});
  await cache.load();
  test.strictSame(Object.keys(cache.tree), ['example', 'utils']);
  test.strictSame(cache.tree.example.parent, cache.tree);
  test.strictSame(typeof cache.tree.example.add, 'object');
  test.strictSame(typeof cache.tree.example.doSomething, 'function');
  test.strictSame(typeof cache.tree.example.stop, 'function');
  test.strictSame(typeof cache.tree.example.start, 'function');
  test.strictSame(cache.tree.utils.UNITS.length, 9);
  test.end();
});
