({
  host: '::',
  balancer: 8000,
  protocol: 'http',
  ports: [8001, 8002],
  nagle: true,
  timeouts: {
    bind: 2000,
    start: 30000,
    stop: 5000,
    request: 5000,
    watch: 1000,
  },
  queue: {
    concurrency: 1000,
    size: 2000,
    timeout: 3000,
  },
  scheduler: {
    concurrency: 1000,
    size: 2000,
    timeout: 3000,
  },
  workers: {
    pool: 2,
  },
});
