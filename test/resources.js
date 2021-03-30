'use strict';

const path = require('path');
const metatests = require('metatests');
const { Resources } = require('../lib/resources.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

metatests.testAsync('lib/resources load', async (test) => {
  const resources = new Resources('cache', application);
  await resources.load();
  test.strictSame(resources.get('/example/add.js').length, 158);
  test.end();
});
