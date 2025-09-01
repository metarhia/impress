'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const wt = require('node:worker_threads');
const cwd = process.cwd();

wt.workerData = { id: 0, kind: 'server', root: cwd, path: cwd, port: 8000 };
const application = require('../lib/application.js');

test('lib/application - should have correct application properties', () => {
  assert.strictEqual(application instanceof EventEmitter, true);
  assert.strictEqual(application.constructor.name, 'Application');
  assert.strictEqual(application.kind, 'server');
  assert.strictEqual(application.initialization, true);
  assert.strictEqual(application.finalization, false);
  assert.strictEqual(typeof application.root, 'string');
  assert.strictEqual(typeof application.path, 'string');
  assert.strictEqual(application.schemas.constructor.name, 'Schemas');
  assert.strictEqual(application.static.constructor.name, 'Static');
  assert.strictEqual(application.cert.constructor.name, 'Cert');
  assert.strictEqual(application.resources.constructor.name, 'Static');
  assert.strictEqual(application.api.constructor.name, 'Api');
  assert.strictEqual(application.lib.constructor.name, 'Code');
  assert.strictEqual(application.db.constructor.name, 'Code');
  assert.strictEqual(application.bus.constructor.name, 'Code');
  assert.deepStrictEqual(application.starts, []);
  assert.strictEqual(application.config, null);
  assert.strictEqual(application.logger, null);
  assert.strictEqual(application.console, null);
  assert.strictEqual(application.auth, null);
  assert.strictEqual(application.watcher, null);
});
