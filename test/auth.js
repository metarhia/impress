'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const auth = require('../lib/auth.js');

const OPTIONS = { characters: 'ABCabc123', secret: 'test-secret', length: 32 };

test('lib/auth - should generate token as non-empty string', () => {
  const provider = auth(OPTIONS);
  const token = provider.generateToken();
  assert.strictEqual(typeof token, 'string');
  assert.ok(token.length > 0);
});

test('lib/auth - should create and read session', async () => {
  const provider = auth(OPTIONS);
  const token = 'create-read-token';
  await provider.createSession(token, { userId: 1 });
  const session = await provider.readSession(token);
  assert.strictEqual(session.token, token);
  assert.deepStrictEqual(session.data, { userId: 1 });
});

test('lib/auth - should return null for unknown token', async () => {
  const provider = auth(OPTIONS);
  const session = await provider.readSession('no-such-token-xyz');
  assert.strictEqual(session, null);
});

test('lib/auth - should save updated session data', async () => {
  const provider = auth(OPTIONS);
  const token = 'save-update-token';
  await provider.createSession(token, { step: 1 });
  await provider.saveSession(token, { step: 2 });
  const session = await provider.readSession(token);
  assert.deepStrictEqual(session.data, { step: 2 });
});

test('lib/auth - saveSession should not create missing session', async () => {
  const provider = auth(OPTIONS);
  await provider.saveSession('ghost-token', { data: true });
  const session = await provider.readSession('ghost-token');
  assert.strictEqual(session, null);
});

test('lib/auth - should delete session', async () => {
  const provider = auth(OPTIONS);
  const token = 'delete-me-token';
  await provider.createSession(token, {});
  await provider.deleteSession(token);
  const session = await provider.readSession(token);
  assert.strictEqual(session, null);
});

test('lib/auth - should register and retrieve user', async () => {
  const provider = auth(OPTIONS);
  await provider.registerUser('alice-auth-test', 'pass123');
  const user = await provider.getUser('alice-auth-test');
  assert.strictEqual(user.login, 'alice-auth-test');
  assert.strictEqual(user.password, 'pass123');
});

test('lib/auth - should return undefined for unknown user', async () => {
  const provider = auth(OPTIONS);
  const user = await provider.getUser('no-such-user-xyz');
  assert.strictEqual(user, undefined);
});

test('lib/auth - createSession should accept extra fields', async () => {
  const provider = auth(OPTIONS);
  const token = 'extra-fields-token';
  await provider.createSession(token, { role: 'admin' }, { ip: '127.0.0.1' });
  const session = await provider.readSession(token);
  assert.strictEqual(session.ip, '127.0.0.1');
  assert.deepStrictEqual(session.data, { role: 'admin' });
});
