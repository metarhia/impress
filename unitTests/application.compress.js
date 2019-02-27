'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const filepath = api.path.join(dir, 'static/js/impress.js');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    const stats = api.fs.statSync(filepath);
    const rawData = api.fs.readFileSync(filepath);
    app.compress(filepath, stats, (err, data, compressed) => {
      test.error(err);
      test.assert(compressed);
      test.assert(data.length < rawData.length);
      test.end();
    });
  });
};
