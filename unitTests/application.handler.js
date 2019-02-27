'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    app.handler('post', 'api/auth/signIn.json', () => {});

    test.assert(app.cache.scripts.has('/www/api/auth/signIn.json/post.js'));
    test.assert(app.cache.files.has('/www/api/auth/signIn.json/post.js'));
    test.assert(app.cache.folders.has('/www/api/auth/signIn.json/'));

    test.end();
  });
};
