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
  const code = new Code('lib', application);
  test.strictSame(code.place, 'lib');
  test.strictSame(typeof code.path, 'string');
  test.strictSame(typeof code.application, 'object');
  test.strictSame(code.tree, {});
  await code.load();
  test.strictSame(Object.keys(code.tree), ['example', 'utils']);
  test.strictSame(code.tree.example.parent, code.tree);
  test.strictSame(typeof code.tree.example.add, 'object');
  test.strictSame(typeof code.tree.example.doSomething, 'function');
  test.strictSame(typeof code.tree.example.stop, 'function');
  test.strictSame(typeof code.tree.example.start, 'function');
  test.strictSame(code.tree.utils.UNITS.length, 9);
  test.end();
});
