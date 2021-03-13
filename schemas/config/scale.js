({
  cloud: 'string',
  server: 'string',
  instance: { enum: ['standalone', 'controller', 'server'] },
  token: { type: 'string', length: 32 },
  gc: 'number',
});
