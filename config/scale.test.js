module.exports = {

  cloud: 'PrivateCloud',
  transport: 'tcp',

  rpcPort: 8250,
  subPort: 8251,

  cookie: 'node',
  health: '5m',
  nagle: false,
  gcInterval: 0,
  watchInterval: '2s',

  slowTime: '5s',
  timeout: '30s',
  keepAlive: '5s',

  servers: {
    S1: {
      instance: 'standalone',
      strategy: 'single',
      services: {
        http: [80]
      }
    },
  },

  waf: {
    enabled: false
  }

};
