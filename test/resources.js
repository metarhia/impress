'use strict';

const path = require('path');
const metatests = require('metatests');
const { Resources } = require('../lib/resources.js');

const root = process.cwd();
const resourcesPath = path.join(root, 'test/cache');

metatests.testAsync('lib/resources load', async (test) => {
  const resources = new Resources(resourcesPath);
  await resources.load();
  test.strictSame(resources.path, resourcesPath);
  test.strictSame(resources.get('/example/add.js').length, 158);
  test.end();
});
