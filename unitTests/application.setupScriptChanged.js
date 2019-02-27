'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    const path = api.path.join(dir, 'setup');
    const file = api.path.join(dir, 'setup/example.js');
    app.setupScriptChanged(path, file, (err, changed) => {
      test.error(err);
      test.assertNot(changed);
      test.end();
    });
  });
};
