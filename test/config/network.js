({
  nagle: true,
  timeouts: {
    bind: 2000,
    request: 5000,
  },
  queue: {
    concurrency: 1000,
    size: 2000,
    timeout: 3000,
  },
});
