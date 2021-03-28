({
  parameters: {
    a: 'number',
    b: 'number',
  },

  method: async ({ a, b }) => {
    const result = a + b;
    return result;
  },

  returns: 'number',
});
