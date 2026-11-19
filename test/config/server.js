({
  balancer: {
    host: '::',
    ports: [8000],
    protocols: ['http/1.1'],
    balance: 'api',
  },
  api: {
    host: '::',
    ports: [8001, 8002],
    protocols: ['http/1.1'],
    cors: { origin: '*' },
  },
});
