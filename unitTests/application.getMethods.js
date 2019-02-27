'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    const methods = app.getMethods('interfaceName');
    test.strictEqual(methods.sort(), [
      'cloudEmitEvent',
      'frontendEmitEvent',
      'methodName',
      'sendEvent',
      'sendEventToAll',
    ]);
    test.end();
  });
};
