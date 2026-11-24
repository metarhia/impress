({
  name: 'failing on purpose',
  run: async () => {
    node.assert.strictEqual(1, 2);
  },
});
