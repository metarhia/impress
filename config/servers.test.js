module.exports = {

  servers: {
    S1: {
      strategy: 'single',
      services: {
        http: [80]
      },
      health: '5m',
      gcInterval: 0,
      fsWatch: '2s',
      cookie: 'node',
      nagle: false,
      slowTime: '1s',
      timeout: '30s',
      keepAlive: '5s'
    }
  }

};
