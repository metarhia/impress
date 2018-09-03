'use strict';

require('../lib/core');

api.test = require('metatests');

api.path = require('path');

api.test.case.show.ok = false;

const testsDir = api.path.resolve(__dirname, '../tests/unittests');
const tests = api.fs.readdirSync(testsDir);

tests.map((fileName) => {
  require(api.path.join(testsDir, fileName));
});

api.test.case.printReport();

if (api.test.case.result.errors !== 0) {
  process.exit(1);
}
