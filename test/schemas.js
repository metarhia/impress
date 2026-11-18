'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { loadSchema } = require('metaschema');
const { createContext } = require('metavm');
const { Config } = require('metaconfiguration');

test('schemas/config - should validate config schemas correctly', async () => {
  const context = createContext({ process });
  const config = await new Config('./test/config', { context });

  const log = await loadSchema('./schemas/config/log.js');
  assert.strictEqual(log.check(config.log).valid, true);

  const scale = await loadSchema('./schemas/config/scale.js');
  assert.strictEqual(scale.check(config.scale).valid, true);

  const server = await loadSchema('./schemas/config/server.js');
  assert.strictEqual(server.check(config.server).valid, true);

  const network = await loadSchema('./schemas/config/network.js');
  assert.strictEqual(network.check(config.network).valid, true);

  const lifecycle = await loadSchema('./schemas/config/lifecycle.js');
  assert.strictEqual(lifecycle.check(config.lifecycle).valid, true);

  const scheduler = await loadSchema('./schemas/config/scheduler.js');
  assert.strictEqual(scheduler.check(config.scheduler).valid, true);

  const workers = await loadSchema('./schemas/config/workers.js');
  assert.strictEqual(workers.check(config.workers).valid, true);

  const sessions = await loadSchema('./schemas/config/sessions.js');
  assert.strictEqual(sessions.check(config.sessions).valid, true);
});

test('schemas/contracts - should load procedure contract', async () => {
  const proc = await loadSchema('./schemas/contracts/procedure.js');
  assert.strictEqual(Object.keys(proc.fields).length, 16);
});
