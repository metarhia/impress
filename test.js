'use strict';

require('./lib/core');

if (impress.isMaster) {
  const unitTestsPath = api.path.join(__dirname, 'unitTests');

  impress.on('testsFinished', errors => {
    if (errors) {
      impress.shutdown(1);
      return;
    }

    api.fs.readdir(unitTestsPath, (err, files) => {
      if (err) {
        console.error(err);
        impress.shutdown(1);
        return;
      }

      const unitTests = api.test.test('Impress unit tests');

      files.forEach(name => {
        const path = api.path.join(unitTestsPath, name);
        const testFn = require(path);
        unitTests.test(name, testFn);
      });

      unitTests.on('done', () => {
        impress.shutdown(unitTests.success ? 0 : 1);
      });
    });
  });
}

impress.start();
