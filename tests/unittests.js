'use strict';

var dir = process.cwd();
require(dir + '/lib/impress');
require(dir + '/lib/api.test');

api.test.case.show.ok = false;

var testsDir = dir + '/tests/unittests/',
    tests = api.fs.readdirSync(testsDir);

tests.map(function(fileName) {
  require(testsDir + fileName);
});

api.test.case.printReport();

if (api.test.case.result.errors !== 0) {
  process.exit(1);
}
