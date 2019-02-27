'use strict';

module.exports = test => {
  const dir = api.path.join(impress.moduleDir, 'applications/example');
  const app = new impress.Application('example', dir);
  app.on('started', () => {
    const placeName = 'setup';
    const path = api.path.join(dir, placeName);
    const file = 'example.js';
    const doneFile = api.path.join(path, 'example.done');
    api.fs.unlinkSync(doneFile);
    app.loadPlaceFile(placeName, path, file, () => {
      test.assert(api.fs.existsSync(doneFile));
      test.end();
    });
  });
};
