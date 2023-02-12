'use strict';

const metatests = require('metatests');
const wt = require('worker_threads');
const cwd = process.cwd();
wt.workerData = { id: 0, kind: 'server', root: cwd, path: cwd, port: 8000 };
const application = require('../lib/application.js');

metatests.test('lib/application', (test) => {
  test.strictSame(typeof application, 'object');
  test.end();
});
