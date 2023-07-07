'use strict';

const metatests = require('metatests');
const deps = require('../lib/deps.js');
const { node, npm, metarhia } = deps;

metatests.test('lib/deps', async (test) => {
  const expectedNamespaces = ['node', 'npm', 'metarhia', 'notLoaded', 'wt'];
  test.strictSame(Object.keys(deps), expectedNamespaces);
  test.strictSame(typeof node, 'object');
  test.strictSame(typeof node.os, 'object');
  test.strictSame(typeof npm, 'object');
  test.strictSame(typeof npm.ws, 'function');
  test.strictSame(typeof metarhia, 'object');
  test.strictSame(typeof metarhia.metaschema, 'object');
  test.strictSame(deps.notLoaded instanceof Set, true);
  test.end();
});
