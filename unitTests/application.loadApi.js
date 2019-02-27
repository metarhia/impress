'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', err => {
    app.api = {};
    app.loadApi(() => {
      test.error(err);
      test.assert('interfaceName' in app.api);
      test.assert('methodName' in app.api.interfaceName);
      test.assert('sendEvent' in app.api.interfaceName);
      test.end();
    });
  });
};
