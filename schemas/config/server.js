({
  host: 'string',
  balancer: 'number',
  protocol: { enum: ['http', 'https'] },
  ports: { array: 'number' },
  nagle: 'boolean',
  timeouts: {
    bind: 'number',
    start: 'number',
    stop: 'number',
    request: 'number',
    reload: 'number',
  },
  queue: {
    concurrency: 'number',
    size: 'number',
    timeout: 'number',
  },
  workers: {
    pool: 'number',
  },
});
