'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    app.on('schemaUpdated', test.mustCall());
    app.updateSchemas({ version: 5 }, err => {
      test.error(err);
      test.end();
    });
  });
};
