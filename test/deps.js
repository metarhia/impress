'use strict';

const metatests = require('metatests');
const { node, npm, metarhia } = require('../lib/deps.js');

metatests.test('lib/deps', async (test) => {
  test.strictSame(typeof node.os, 'object');
  test.strictSame(typeof npm.ws, 'function');
  test.strictSame(typeof metarhia.metaschema, 'object');
  test.end();
});
