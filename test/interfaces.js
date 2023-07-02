'use strict';

const path = require('node:path');
const metavm = require('metavm');
const metatests = require('metatests');
const { Apis } = require('../lib/apis.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  sandbox: metavm.createContext({ api: {} }),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

metatests.testAsync('lib/apis load', async (test) => {
  const api = new Apis('api', application);
  await api.load();
  test.strictSame(typeof api.collection.example['1'].add.method, 'function');
  test.end();
});
