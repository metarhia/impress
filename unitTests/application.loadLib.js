'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const path = api.path.join(dir, 'lib/subdir');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    delete app.sandbox.api.cities;
    app.cache.scripts.delete('/lib/subdir/cities.js');
    app.loadLib(path, err => {
      test.error(err);
      test.assert(app.sandbox.api.cities);
      test.end();
    });
  });
};
