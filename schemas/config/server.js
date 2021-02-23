({
  host: 'string',
  balancer: 'number',
  protocol: { type: 'flag', enum: ['string'] },
  ports: { type: { arrey: 'number', default: [8001] } },
  timeout: { type: 'number', default: 5000 },
  queue: {
    concurrency: { type: 'number', default: 1000 },
    size: { type: 'number', default: 2000 },
    timeout: { type: 'number', default: 3000 },
  },
  workers: {
    pool: { type: 'number', default: 0 },
    timeout: { type: 'number', default: 3000 },
  },
});
