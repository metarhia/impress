'use strict';

const path = require('path');
const metavm = require('metavm');
const metatests = require('metatests');
const { Interfaces } = require('../lib/interfaces.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  sandbox: metavm.createContext({ api: {} }),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
  Error,
};

metatests.testAsync('lib/interfaces load', async (test) => {
  const api = new Interfaces('api', application);
  await api.load();
  test.strictSame(await api.collection.geo['1'].schemaCity.invoke('context'), {
    context: 'context',
    data: { name: 'string' },
  });
  const request = {
    method: 'hook',
    args: { a: 1, b: 2 },
    verb: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };
  const context = { client: { ip: '127.0.0.1' } };
  test.strictSame(
    await api.collection.hook['1'].router.invoke(context, request),
    { ...request, ip: context.client.ip },
  );
  test.strictSame(typeof api.collection.example['1'].add.method, 'function');
  test.end();
});
