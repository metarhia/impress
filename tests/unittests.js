'use strict';

require('../lib/core');

api.path = require('path');

const testsDir = api.path.resolve(__dirname, '../tests/unittests');
const tests = api.fs.readdirSync(testsDir);

tests.map((fileName) => {
  require(api.path.join(testsDir, fileName));
});
