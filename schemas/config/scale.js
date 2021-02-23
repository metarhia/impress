({
  cloud: 'string',
  server: 'string',
  instance: { type: 'flag', enum: ['standalone', 'controller', 'server'] },
  token: { type: 'string', length: 32 },
  gc: { type: 'number', default: 60 * 60 * 1000 },
});
