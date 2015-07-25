'use strict';

var dir = process.cwd();
require(dir + '/lib/impress');
require(dir + '/lib/impress.tests');

impress.test.show.ok = false;

var testsDir = dir + '/tests/unittests/',
    tests = api.fs.readdirSync(testsDir);

tests.map(function(fileName) {
  require(testsDir + fileName);
});

impress.test.printReport();
