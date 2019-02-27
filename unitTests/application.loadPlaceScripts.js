'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    app.initScriptLoaded = false;
    app.cache.scripts.delete('/init/example.js');
    app.loadPlaceScripts('init', () => {
      test.assert(app.initScriptLoaded);
      test.end();
    });
  });
};
