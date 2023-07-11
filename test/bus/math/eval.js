({
  parameters: {
    expr: 'string',
    precision: 'number',
  },

  method: {
    post: 'v4',
    body: ['expr', 'precision'],
  },
});
