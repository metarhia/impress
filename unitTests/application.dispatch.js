'use strict';

const PORT = 9000;

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  const server = api.http.createServer(app.dispatch.bind(app)).listen(PORT);
  app.on('started', () => {
    // app.on('clientConnect', test.mustCall());
    // api.http.get(`http://localhost:${PORT}`, () => {
    server.close();
    test.end();
    // });
  });
};
