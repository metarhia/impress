'use strict';

var dir = __dirname;
require(dir + '/../lib/impress');
require(dir + '/../lib/api.test');

api.test.case.show.ok = false;

var testsDir = dir + '/unittests/',
    tests = api.fs.readdirSync(testsDir);

tests.map(function(fileName) {
  require(testsDir + fileName);
});

api.test.case.printReport();

if (api.test.case.result.errors !== 0) {
  process.exit(1);
}
