'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
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

test('lib/code - should load code correctly', async () => {
  const code = new Code('lib', application);
  assert.strictEqual(code.name, 'lib');
  assert.strictEqual(typeof code.path, 'string');
  assert.strictEqual(typeof code.application, 'object');
  assert.deepStrictEqual(code.tree, {});

  await code.load();
  assert.deepStrictEqual(Object.keys(code.tree), ['example', 'utils']);
  assert.strictEqual(code.tree.example.parent, code.tree);
  assert.strictEqual(typeof code.tree.example.add, 'object');
  assert.strictEqual(typeof code.tree.example.doSomething, 'function');
  assert.strictEqual(typeof code.tree.example.stop, 'function');
  assert.strictEqual(typeof code.tree.example.start, 'function');
  assert.strictEqual(code.tree.utils.UNITS.length, 9);
});
