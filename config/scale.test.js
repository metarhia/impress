module.exports = {

  cloud: 'PrivateCloud',
  transport: 'tcp',

  rpcPort: 8250,
  subPort: 8251,

  health: '5m',
  gcInterval: 0,
  fsWatch: '2s',
  cookie: 'node',
  nagle: false,
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
