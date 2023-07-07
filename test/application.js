'use strict';

const { EventEmitter } = require('node:events');
const wt = require('node:worker_threads');
const metatests = require('metatests');
const cwd = process.cwd();
wt.workerData = { id: 0, kind: 'server', root: cwd, path: cwd, port: 8000 };
const application = require('../lib/application.js');

metatests.test('lib/application', (test) => {
  test.strictSame(application instanceof EventEmitter, true);
  test.strictSame(application.constructor.name, 'Application');
  test.strictSame(application.kind, 'server');
  test.strictSame(application.initialization, true);
  test.strictSame(application.finalization, false);
  test.strictSame(typeof application.root, 'string');
  test.strictSame(typeof application.path, 'string');
  test.strictSame(application.schemas.constructor.name, 'Schemas');
  test.strictSame(application.static.constructor.name, 'Static');
  test.strictSame(application.cert.constructor.name, 'Cert');
  test.strictSame(application.resources.constructor.name, 'Static');
  test.strictSame(application.api.constructor.name, 'Api');
  test.strictSame(application.lib.constructor.name, 'Place');
  test.strictSame(application.db.constructor.name, 'Place');
  test.strictSame(application.bus.constructor.name, 'Place');
  test.strictSame(application.starts, []);
  test.strictSame(application.config, null);
  test.strictSame(application.logger, null);
  test.strictSame(application.console, null);
  test.strictSame(application.auth, null);
  test.strictSame(application.watcher, null);
  test.end();
});
