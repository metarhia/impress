({
  sum: async ({ a, b }) => a + b,

  where: async () => application.worker.id,

  echo: async (value) => value,

  fail: async ({ code }) => {
    throw new DomainError(code);
  },

  slow: async ({ ms }) => {
    await metarhia.metautil.delay(ms);
    return ms;
  },

  tick: async ({ file }) => {
    await node.fs.promises.appendFile(file, '.');
  },
});
