'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const metacom = require('metacom');
if (typeof metacom.buildHeaders !== 'function') {
  metacom.buildHeaders = (cors = {}) => ({
    'Access-Control-Allow-Origin': cors.origin ?? '*',
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

const readHttp = (port, method, host, route) =>
  new Promise((resolve, reject) => {
    const headers = { Host: host, Connection: 'close' };
    const options = {
      hostname: '127.0.0.1',
      port,
      method,
      path: route,
      headers,
    };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        const status = res.statusCode;
        const location = res.headers.location ?? '';
        resolve({ status, location, body });
      });
    });
    req.on('error', reject);
    req.end();
  });

test('lib/balancer - https redirect answers 301 without a body', async () => {
  const options = makeOptions(0);
  options.redirect = 'https';
  const balancer = new Balancer({ console: mockConsole }, options);
  await balancer.listen();
  try {
    const address = balancer.httpServer.address();
    const port = typeof address === 'object' ? address.port : 0;
    const posted = await readHttp(port, 'POST', 'xxii.chat:444', '/room');
    assert.strictEqual(posted.status, 301);
    assert.strictEqual(posted.location, 'https://xxii.chat:444/room');
    assert.strictEqual(posted.body, '');
    const got = await readHttp(port, 'GET', 'xxii.chat', '/room?x=1');
    assert.strictEqual(got.status, 301);
    assert.strictEqual(got.location, 'https://xxii.chat/room?x=1');
    assert.strictEqual(got.body, '');
  } finally {
    await balancer.close();
  }
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
