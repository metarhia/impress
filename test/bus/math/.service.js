({
  url: 'https://api.mathjs.org',
  limits: [
    { calls: 10, per: '1m' },
    { calls: 10000, per: '1d' },
  ],
});
