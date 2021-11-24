'use strict';

const path = require('path');
const metatests = require('metatests');
const { Modules } = require('../lib/modules.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  console,
  starts: [],
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
  invoke({ method, exclusive = false, args }) {
    console.log({ method, exclusive, args });
    return new Promise((resolve) => {
      resolve(args);
    });
  },
};

metatests.testAsync('lib/modules load', async (test) => {
  const cache = new Modules('cache', application);
  await cache.load();
  test.strictSame(cache.tree.utils.UNITS.length, 9);

  const { example } = cache.tree;
  const allFromThread = async () => {
    const result = await Promise.all([
      example.thread.method1({ val: '2' }).inThread({ exclusive: true }),
      example.thread.method1({ val: '2' }).inThread({ exclusive: false }),
      example.thread.method1({ val: '2' }),
      example.thread.method2({ val: '2' }).catch((err) => {
        test.strictSame(err.message, 'I AM ERROR');
      }),
    ]);
    return { result };
  };

  const { result } = await allFromThread();

  console.dir({ result });

  for (let i = 0; i < result.length - 1; i++) {
    test.strictSame(result[i], { val: '2' });
  }

  test.end();
});
