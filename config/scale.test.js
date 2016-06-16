{
  cloud:    'PrivateCloud',
  instance: 'standalone',

  host: '127.0.0.1',
  port: 8250,

  cluster:  'C1',
  cookie:   'node',
  strategy: 'single',
  workers:  1,

  waf: {
    enabled: false
  },

  health:     '5s',
  nagle:      false,
  gcInterval: 0,
  watchInterval: '2s'
}