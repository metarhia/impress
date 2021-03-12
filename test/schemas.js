'use strict';

const metatests = require('metatests');
const { loadSchema } = require('metaschema');

metatests.testAsync('schemas/config', async (test) => {
  const log = await loadSchema('./schemas/config/log.js');
  test.strictSame(Object.keys(log.fields).length, 5);
  const scale = await loadSchema('./schemas/config/scale.js');
  test.strictSame(Object.keys(scale.fields).length, 5);
  const server = await loadSchema('./schemas/config/server.js');
  test.strictSame(Object.keys(server.fields).length, 7);
  const sessions = await loadSchema('./schemas/config/sessions.js');
  test.strictSame(Object.keys(sessions.fields).length, 8);
  test.end();
});

metatests.testAsync('schemas/contracts', async (test) => {
  const proc = await loadSchema('./schemas/contracts/procedure.js');
  test.strictSame(Object.keys(proc.fields).length, 16);
  test.end();
});
