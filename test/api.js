'use strict';

const path = require('node:path');
const metavm = require('metavm');
const metatests = require('metatests');
const { Api } = require('../lib/api.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  sandbox: metavm.createContext({ api: {} }),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
  config: { server: { timeouts: {} } },
};

metatests.testAsync('lib/api load', async (test) => {
  const api = new Api('api', application);
  await api.load();
  const { example } = api.collection;
  test.strictSame(example.default, 1);
  const { add } = example['1'];
  test.strictSame(add.constructor.name, 'Procedure');
  test.strictSame(typeof add.method, 'function');
  test.strictSame(add.method.constructor.name, 'AsyncFunction');
  const exportsKeys = ['parameters', 'method', 'returns'];
  test.strictSame(Object.keys(add.exports), exportsKeys);
  test.strictSame(typeof add.script, 'function');
  test.strictSame(add.methodName, 'method');
  test.strictSame(typeof add.application, 'object');
  test.strictSame(add.parameters.constructor.name, 'Schema');
  test.strictSame(add.returns.constructor.name, 'Schema');
  test.strictSame(add.errors, null);
  test.strictSame(add.semaphore, null);
  test.strictSame(add.caption, '');
  test.strictSame(add.description, '');
  test.strictSame(add.access, '');
  test.strictSame(add.validate, null);
  test.strictSame(add.timeout, 0);
  test.strictSame(add.serializer, null);
  test.strictSame(add.protocols, null);
  test.strictSame(add.deprecated, false);
  test.strictSame(add.assert, null);
  test.strictSame(add.examples, null);
  test.end();
});
