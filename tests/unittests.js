'use strict';

require('../lib/impress');
require('../lib/api.test');

api.path = require('path');

api.test.case.show.ok = false;

let testsDir = api.path.resolve(__dirname, '../tests/unittests'),
    tests = api.fs.readdirSync(testsDir);

tests.map((fileName) => {
  require(api.path.join(testsDir, fileName));
});

api.test.case.printReport();

if (api.test.case.result.errors !== 0) {
  process.exit(1);
}
