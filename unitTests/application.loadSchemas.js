'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    app.loadSchemas((err, schema) => {
      test.error(err);
      test.assert(schema instanceof api.metaschema.Metaschema);
      test.end();
    });
  });
};
