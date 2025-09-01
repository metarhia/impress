'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const deps = require('../lib/deps.js');
const { node, npm, metarhia } = deps;

test('lib/deps - should have correct dependencies structure', async () => {
  const expectedNamespaces = ['node', 'npm', 'metarhia', 'notLoaded', 'wt'];
  assert.deepStrictEqual(Object.keys(deps), expectedNamespaces);
  assert.strictEqual(typeof node, 'object');
  assert.strictEqual(typeof node.os, 'object');
  assert.strictEqual(typeof npm, 'object');
  assert.strictEqual(typeof npm.ws, 'function');
  assert.strictEqual(typeof metarhia, 'object');
  assert.strictEqual(typeof metarhia.metaschema, 'object');
  assert.strictEqual(deps.notLoaded instanceof Set, true);
});
