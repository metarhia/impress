'use strict';

require('../lib/impress');
require('../lib/api.test');

api.path = require('path');

api.test.case.show.ok = false;

var testsDir = api.path.resolve(__dirname, '../tests/unittests'),
    tests = api.fs.readdirSync(testsDir);

tests.map(function(fileName) {
  require(api.path.join(testsDir, fileName));
});

api.test.case.printReport();

if (api.test.case.result.errors !== 0) {
  process.exit(1);
}
