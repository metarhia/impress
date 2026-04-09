'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// buildHeaders was removed from metacom; stub it so Balancer can be constructed
const metacom = require('metacom');
if (typeof metacom.buildHeaders !== 'function') {
  metacom.buildHeaders = (cors = {}) => ({
    'Access-Control-Allow-Origin': cors.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
}

const { Balancer } = require('../lib/balancer.js');

const mockConsole = {
  info() {},
  warn() {},
  error() {},
};

const makeOptions = (port = 0) => ({
  cors: {},
  protocol: 'http',
  ports: [8001],
  port,
  host: '127.0.0.1',
  timeouts: { bind: 100 },
  retry: 3,
});

test('lib/balancer - should create balancer with http server', () => {
  const balancer = new Balancer({ console: mockConsole }, makeOptions());
  assert.ok(balancer.httpServer instanceof http.Server);
  assert.strictEqual(balancer.httpServer.listening, false);
});

test('lib/balancer - should listen on available port and close', async () => {
  const balancer = new Balancer({ console: mockConsole }, makeOptions(0));
  await balancer.listen();
  assert.strictEqual(balancer.httpServer.listening, true);
  await balancer.close();
  assert.strictEqual(balancer.httpServer.listening, false);
});

test('lib/balancer - close should be no-op when not listening', async () => {
  const balancer = new Balancer({ console: mockConsole }, makeOptions());
  await assert.doesNotReject(() => balancer.close());
});

const NON_EADDRINUSE = 'lib/balancer - listen rejects on non-EADDRINUSE error';
test(NON_EADDRINUSE, async () => {
  const balancer = new Balancer({ console: mockConsole }, makeOptions());
  balancer.httpServer.listen = function () {
    process.nextTick(() => {
      const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      this.emit('error', error);
    });
    return this;
  };
  await assert.rejects(() => balancer.listen(), { code: 'EACCES' });
});
