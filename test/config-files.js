'use strict';

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert');

const { createContext } = require('metavm');
const { Config } = require('metaconfiguration');

const { CONFIG_SECTIONS, collectConfigErrors } = require('../lib/config.js');

const root = path.join(__dirname, '..');

const SECTIONS = ['network', 'lifecycle', 'scheduler', 'workers'];

const FORBIDDEN = [
  { key: 'nagle', file: 'network.js' },
  { key: 'queue', file: 'network.js' },
  { key: 'timeouts', file: 'network.js and lifecycle.js' },
  { key: 'scheduler', file: 'scheduler.js' },
  { key: 'workers', file: 'workers.js' },
  { key: 'services', file: 'server.js groups' },
];

const loadConfig = async () => {
  const context = createContext({ process });
  return new Config('./test/config', { context });
};

test('config files - loader checks moved sections', () => {
  for (const name of SECTIONS) {
    assert.ok(CONFIG_SECTIONS.includes(name));
  }
});

test('config files - missing network.js is reported', async () => {
  const config = await loadConfig();
  config.network = undefined;
  const messages = await collectConfigErrors(config, root);
  const text = messages.join('\n');
  const expected = 'network.js is required in application/config/network.js';
  assert.ok(text.includes(expected), text);
});

test('config files - valid sections pass', async () => {
  const config = await loadConfig();
  const messages = await collectConfigErrors(config, root);
  assert.deepStrictEqual(messages, []);
});

for (const item of FORBIDDEN) {
  const name = `config/server.js - ${item.key} names ${item.file}`;
  test(name, async () => {
    const config = await loadConfig();
    const extra = { [item.key]: true };
    config.server = { ...config.server, ...extra };
    const messages = await collectConfigErrors(config, root);
    assert.strictEqual(messages.length, 1);
    const text = messages[0];
    assert.ok(text.includes(item.key), text);
    assert.ok(text.includes(item.file), text);
    assert.ok(text.includes('application/config/server.js'), text);
  });
}

const GROUP_KEYS = ['host', 'ports', 'protocol', 'balancer', 'cors'];

for (const key of GROUP_KEYS) {
  const name = `config/server.js - ${key} belongs on a group`;
  test(name, async () => {
    const config = await loadConfig();
    const extra = { [key]: key === 'ports' ? [1] : 'old' };
    config.server = { ...config.server, ...extra };
    const messages = await collectConfigErrors(config, root);
    assert.strictEqual(messages.length, 1);
    const text = messages[0];
    assert.ok(text.includes(key), text);
    assert.ok(text.includes('group'), text);
    assert.ok(text.includes('application/config/server.js'), text);
  });
}

test('config/server.js - repeated port fails', async () => {
  const config = await loadConfig();
  config.server = {
    edge: { ports: [8001, [8002, 8001]], protocols: ['http/1.1'] },
    api: { ports: [8002], protocols: ['http/1.1'] },
  };
  const messages = await collectConfigErrors(config, root);
  const text = messages.join('\n');
  assert.ok(text.includes('Port 8001 is repeated'), text);
  assert.ok(text.includes('Port 8002 is repeated'), text);
  assert.ok(text.includes('group "edge"'), text);
  assert.ok(text.includes('group "api"'), text);
  assert.ok(text.includes('application/config/server.js'), text);
});

test('config/server.js - missing provider names the group', async () => {
  const config = await loadConfig();
  config.server = {
    rtc: { ports: [3478], protocols: ['stun.turn', 'http/1.1'] },
  };
  const messages = await collectConfigErrors(config, root);
  assert.strictEqual(messages.length, 1);
  const text = messages[0];
  assert.ok(text.includes('No provider for protocol "stun.turn"'), text);
  assert.ok(text.includes('group "rtc"'), text);
  assert.ok(text.includes('application/config/server.js'), text);
});

test('config/server.js - unknown protocol names the group', async () => {
  const config = await loadConfig();
  config.server = {
    rtc: { ports: [3478], protocols: ['carrier.pigeon'] },
  };
  const messages = await collectConfigErrors(config, root);
  assert.strictEqual(messages.length, 1);
  const text = messages[0];
  assert.ok(text.includes('Unknown protocol "carrier.pigeon"'), text);
  assert.ok(text.includes('group "rtc"'), text);
  assert.ok(text.includes('application/config/server.js'), text);
});

test('config/server.js - balance and tls rules', async () => {
  const config = await loadConfig();
  config.server = {
    edge: {
      ports: [8000],
      protocols: ['http/1.1'],
      balance: 'missing',
      redirect: 'https',
    },
    udp: {
      ports: [3478],
      protocols: ['http/1.1'],
      transports: ['udp'],
      tls: true,
      domains: ['turn.example'],
    },
  };
  const messages = await collectConfigErrors(config, root);
  const text = messages.join('\n');
  assert.ok(text.includes('Unknown balance target "missing"'), text);
  assert.ok(text.includes('balance and redirect cannot be combined'), text);
  assert.ok(text.includes('tls requires tcp'), text);
  assert.ok(text.includes('domains requires tcp'), text);
  assert.ok(text.includes('application/config/server.js'), text);
});

test('config/server.js - domains on an unnamed protocol fails', async () => {
  const config = await loadConfig();
  config.server = {
    raw: {
      ports: [9],
      protocols: ['raw.bytes'],
      transports: ['tcp'],
      domains: ['example.com'],
    },
  };
  const owners = new Map();
  owners.set('raw.bytes', ['fixture']);
  const messages = await collectConfigErrors(config, root, { owners });
  const text = messages.join('\n');
  assert.strictEqual(messages.length, 1, text);
  assert.ok(text.includes('domains requires a named protocol'), text);
  assert.ok(text.includes('group "raw"'), text);
  assert.ok(text.includes('application/config/server.js'), text);
});
