({
  host: '::',
  balancer: 8000,
  protocol: 'http',
  ports: [8001, 8002],
  timeout: 5000,
  queue: {
    concurrency: 1000,
    size: 2000,
    timeout: 3000,
  },
  workers: {
    pool: 2,
    timeout: 3000,
  },
});
