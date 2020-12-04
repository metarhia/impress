'use strict';

const metatests = require('metatests');
const dependencies = require('../lib/dependencies.js');

metatests.test('lib/dependencies', async test => {
  test.strictSame(typeof dependencies.node.os, 'object');
  test.strictSame(typeof dependencies.npm.ws, 'function');
  test.strictSame(typeof dependencies.metarhia.metavm, 'object');
  test.end();
});
