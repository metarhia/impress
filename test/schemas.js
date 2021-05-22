'use strict';

const metatests = require('metatests');
const { loadSchema } = require('metaschema');
const { createContext } = require('metavm');
const { Config } = require('metaconfiguration');

metatests.testAsync('schemas/config', async (test) => {
  const context = createContext({ process });
  const config = await new Config('./test/config', { context });

  const log = await loadSchema('./schemas/config/log.js');
  test.strictSame(log.check(config.log).valid, true);

  const scale = await loadSchema('./schemas/config/scale.js');
  test.strictSame(scale.check(config.scale).valid, true);

  const server = await loadSchema('./schemas/config/server.js');
  test.strictSame(server.check(config.server).valid, true);

  const sessions = await loadSchema('./schemas/config/sessions.js');
  test.strictSame(sessions.check(config.sessions).valid, true);

  test.end();
});

metatests.testAsync('schemas/contracts', async (test) => {
  const proc = await loadSchema('./schemas/contracts/procedure.js');
  test.strictSame(Object.keys(proc.fields).length, 16);
  test.end();
});
