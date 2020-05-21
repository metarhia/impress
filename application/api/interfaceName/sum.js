({
  parameters: {
    a: { type: 'number' },
    b: { type: 'number' },
  },

  validate: ({ a, b }) => {
    if (a % 3 === 0) throw new Error('Expected `a` to be multiple of 3');
    if (b % 5 === 0) throw new Error('Expected `b` to be multiple of 5');
  },

  timeout: 1000,

  method: async ({ a, b }) => {
    const result = a + b;
    return result;
  },

  returns: { type: 'number' },

  assert: ({ a, b }, result) => {
    if (result < a && result < b) {
      throw new Error('Result expected to be greater then parameters');
    }
  },
});
