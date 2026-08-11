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

test('lib/bus - should load bus correctly', async () => {
  const bus = new Code('bus', application);
  assert.strictEqual(bus.name, 'bus');
  assert.strictEqual(bus.path, path.join(root, 'test/bus'));
  assert.strictEqual(typeof bus.application, 'object');
  assert.deepStrictEqual(bus.tree, {});

  await bus.load();
  const expected = ['fakerapi', 'math', 'worldTime'];
  assert.deepStrictEqual(Object.keys(bus.tree), expected);
  assert.strictEqual(bus.tree.math.parent, bus.tree);
  assert.strictEqual(typeof bus.tree.math, 'object');
  assert.strictEqual(typeof bus.tree.math.eval, 'function');
  const evalType = bus.tree.math.eval.constructor.name;
  assert.strictEqual(evalType, 'AsyncFunction');
  assert.strictEqual(typeof bus.tree.math['.service'], 'function');
  const mathUrl = bus.tree.math['.service'].url;
  assert.strictEqual(mathUrl, 'https://api.mathjs.org');
});
