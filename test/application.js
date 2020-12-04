'use strict';

const metatests = require('metatests');
const application = require('../lib/application.js');

metatests.test('lib/application', test => {
  test.strictSame(typeof application, 'object');
  test.end();
});
