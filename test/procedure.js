'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const metautil = require('metautil');
const { Procedure } = require('../lib/procedure.js');

test('lib/procedure - should create procedure correctly', async () => {
  const script = () => ({
    method: async ({ a, b }) => a + b,
  });

  const application = {
    Error,
    semaphore: {
      async enter() {},
      leave() {},
    },
    config: { server: { timeouts: {} } },
  };

  const procedure = new Procedure(script, 'method', application);

  assert.strictEqual(procedure.constructor.name, 'Procedure');
  assert.strictEqual(typeof procedure.exports, 'object');
  assert.strictEqual(typeof procedure.exports.method, 'function');
  assert.strictEqual(typeof procedure.script, 'function');
  assert.strictEqual(procedure.methodName, 'method');
  assert.strictEqual(typeof procedure.application, 'object');
  assert.strictEqual(typeof procedure.method, 'function');
  assert.strictEqual(procedure.method.constructor.name, 'AsyncFunction');
  assert.strictEqual(procedure.parameters, null);
  assert.strictEqual(procedure.returns, null);
  assert.strictEqual(procedure.errors, null);
  assert.strictEqual(procedure.semaphore, null);
  assert.strictEqual(procedure.caption, '');
  assert.strictEqual(procedure.description, '');
  assert.strictEqual(procedure.access, '');
  assert.strictEqual(procedure.validate, null);
  assert.strictEqual(typeof procedure.timeout, 'number');
  assert.strictEqual(procedure.serializer, null);
  assert.strictEqual(procedure.protocols, null);
  assert.strictEqual(procedure.deprecated, false);
  assert.strictEqual(procedure.assert, null);
  assert.strictEqual(procedure.examples, null);

  const result = await procedure.invoke({}, { a: 4, b: 6 });
  assert.strictEqual(result, 10);
});

test('lib/procedure - should validate procedure correctly', async () => {
  const script = () => ({
    validate: ({ a, b }) => {
      if (a % 3 === 0) throw new Error('Expected `a` to be multiple of 3');
      if (b % 5 === 0) throw new Error('Expected `b` to be multiple of 5');
    },

    method: async ({ a, b }) => {
      const result = a + b;
      return result;
    },
  });

  const application = {
    Error,
    semaphore: {
      async enter() {},
      leave() {},
    },
    config: { server: { timeouts: {} } },
  };
  const procedure = new Procedure(script, 'method', application);

  await assert.rejects(
    () => procedure.invoke({}, { a: 3, b: 6 }),
    new Error('Expected `a` to be multiple of 3'),
  );

  const result = await procedure.invoke({}, { a: 4, b: 6 });
  assert.strictEqual(result, 10);
});

test('lib/procedure - should validate procedure async', async () => {
  const script = () => ({
    validate: async ({ a, b }) => {
      await metautil.delay(100);
      if (a % 3 === 0) {
        throw new Error('Expected `a` not to be multiple of 3');
      }
      if (b % 5 === 0) {
        throw new Error('Expected `b` not to be multiple of 5');
      }
    },

    method: async ({ a, b }) => a + b,
  });

  const application = {
    Error,
    semaphore: {
      async enter() {},
      leave() {},
    },
    config: { server: { timeouts: {} } },
  };
  const procedure = new Procedure(script, 'method', application);

  await assert.rejects(
    () => procedure.invoke({}, { a: 4, b: 10 }),
    new Error('Expected `b` not to be multiple of 5'),
  );

  const result = await procedure.invoke({}, { a: 4, b: 6 });
  assert.strictEqual(result, 10);
});

test('lib/procedure - should handle timeout correctly', async () => {
  const DONE = 'success';

  const script = () => ({
    timeout: 100,

    method: async ({ waitTime }) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(DONE), waitTime);
      }),
  });

  const application = {
    Error,
    semaphore: {
      async enter() {},
      leave() {},
    },
    config: { server: { timeouts: { request: 20 } } },
  };

  const procedure = new Procedure(script, 'method', application);

  await assert.rejects(
    () => procedure.invoke({}, { waitTime: 150 }),
    new Error('Timeout of 100ms reached'),
  );

  const result = await procedure.invoke({}, { waitTime: 50 });
  assert.strictEqual(result, DONE);
});

test('lib/procedure - should handle queue correctly', async () => {
  const DONE = 'success';

  const script = () => ({
    queue: {
      concurrency: 1,
      size: 1,
      timeout: 15,
    },

    method: async ({ waitTime }) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(DONE), waitTime);
      }),
  });

  const application = {
    Error,
    semaphore: {
      async enter() {},
      leave() {},
    },
    config: { server: { timeouts: {} } },
  };

  const rpc = async (proc, args) => {
    let result = null;
    await proc.enter();
    try {
      result = await proc.invoke({}, args);
    } catch {
      throw new Error('Procedure.invoke failed. Check your script.method');
    }
    proc.leave();
    return result;
  };

  const procedure = new Procedure(script, 'method', application);

  const invokes = await Promise.allSettled([
    rpc(procedure, { waitTime: 2 }),
    rpc(procedure, { waitTime: 1 }),
  ]);
  const last = invokes[1];
  assert.strictEqual(last.value, DONE);

  await assert.rejects(async () => {
    const invokes = await Promise.allSettled([
      rpc(procedure, { waitTime: 16 }),
      rpc(procedure, { waitTime: 1 }),
    ]);
    const last = invokes[1];
    if (last.status === 'rejected') throw last.reason;
    return last.value;
  }, new Error('Semaphore timeout'));

  await assert.rejects(async () => {
    const invokes = await Promise.allSettled([
      rpc(procedure, { waitTime: 1 }),
      rpc(procedure, { waitTime: 1 }),
      rpc(procedure, { waitTime: 1 }),
    ]);
    const last = invokes[2];
    if (last.status === 'rejected') throw last.reason;
    return last.value;
  }, new Error('Semaphore queue is full'));
});

test('lib/procedure - should handle global timeouts.request', async () => {
  const DONE = 'success';

  const script = () => ({
    timeout: undefined,

    method: async ({ waitTime }) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(DONE), waitTime);
      }),
  });

  const application = {
    Error,
    semaphore: {
      async enter() {},
      leave() {},
    },
    config: { server: { timeouts: { request: 10 } } },
  };

  const procedure = new Procedure(script, 'method', application);

  await assert.rejects(
    () => procedure.invoke({}, { waitTime: 20 }),
    new Error('Timeout of 10ms reached'),
  );
});
