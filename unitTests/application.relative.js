'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const subdir = api.path.join(dir, 'api/interfaceName/methodName');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    test.strictSame(app.relative(subdir), '/api/interfaceName/methodName');
    test.end();
  });
};
