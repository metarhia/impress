'use strict';

require('./lib/impress');
require('./lib/impress.tests');

impress.test.show.ok = false;

var testsDir = './unittests/',
    tests = api.fs.readdirSync(testsDir);

tests.map(function(fileName) {
  require(testsDir + fileName);
});

impress.test.printReport();
