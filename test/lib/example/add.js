({
  parameters: {
    a: 'number',
    b: 'number',
  },

  method({ a, b }) {
    console.debug({ a, b });
    return a + b;
  },

  returns: 'number',
});
