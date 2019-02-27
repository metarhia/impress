'use strict';

const SHOULD_LOAD = true;
const SHOULD_NOT_LOAD = false;

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    const scripts = [
      [
        'init',
        api.path.join(dir, 'init'),
        api.path.join(dir, 'init/example.js'),
      ],
      [
        'init',
        api.path.join(dir, 'init'),
        api.path.join(dir, 'init/list.renameToJs'),
      ],
    ];

    api.metasync.map(
      scripts,
      (args, cb) => app.processPlaceFile(...args, cb),
      (err, toLoad) => {
        test.error(err);
        test.strictSame(toLoad, [SHOULD_LOAD, SHOULD_NOT_LOAD]);
        test.end();
      }
    );
  });
};
