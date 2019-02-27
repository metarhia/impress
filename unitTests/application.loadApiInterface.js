'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const path = api.path.join(dir, 'api/interfaceName');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    app.api = {};
    app.loadApiInterface('interfaceName', path, err => {
      test.error(err);
      test.assert('interfaceName' in app.api);
      test.assert('methodName' in app.api.interfaceName);
      test.assert('sendEvent' in app.api.interfaceName);
      test.end();
    });
  });
};
