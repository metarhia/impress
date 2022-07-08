'use strict';

const metatests = require('metatests');
const metautil = require('metautil');
const { Procedure } = require('../lib/procedure.js');

metatests.testAsync('lib/procedure validate', async (test) => {
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
    server: {
      semaphore: {
        async enter() {},
        leave() {},
      },
    },
    schemas: { model: null },
  };
  const procedure = new Procedure(script, 'method', application);

  await test.rejects(
    () => procedure.invoke({}, { a: 3, b: 6 }),
    new Error('Expected `a` to be multiple of 3'),
  );

  await test.resolves(() => procedure.invoke({}, { a: 4, b: 6 }), 10);
  test.end();
});

metatests.testAsync('lib/procedure validate async', async (test) => {
  const script = () => ({
    validate: async ({ a, b }) => {
      await metautil.delay(100);
      if (a % 3 === 0) throw new Error('Expected `a` not to be multiple of 3');
      if (b % 5 === 0) throw new Error('Expected `b` not to be multiple of 5');
    },

    method: async ({ a, b }) => a + b,
  });

  const application = {
    Error,
    server: {
      semaphore: {
        async enter() {},
        leave() {},
      },
    },
  };
  const procedure = new Procedure(script, 'method', application);

  await test.rejects(
    procedure.invoke({}, { a: 4, b: 10 }),
    new Error('Expected `b` not to be multiple of 5'),
  );

  await test.resolves(procedure.invoke({}, { a: 4, b: 6 }), 10);
});

metatests.testAsync('lib/procedure timeout', async (test) => {
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
    server: {
      semaphore: {
        async enter() {},
        leave() {},
      },
    },
  };

  const procedure = new Procedure(script, 'method', application);

  await test.rejects(
    async () => procedure.invoke({}, { waitTime: 150 }),
    new Error('Timeout reached'),
  );

  await test.resolves(() => procedure.invoke({}, { waitTime: 50 }), DONE);
});
