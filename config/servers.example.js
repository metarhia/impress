// Cloud configuration

module.exports = {

  presets: { // presets for server config
    default: {
      instance: 'standalone', // cloud instance type: standalone, controller, server
      strategy: 'bundle',
      // single - one process (no master and workers)
      // bundle - multiple processes, one master and different workers for each server (master should not listen ports)
      // cluster - multiple processes, one master and identical workers with no sticky (master should listen ports)
      // sticky - multiple processes, one master and workers with sticky by IP (master should listen ports)
      workers: 1, // worker count, e.g. api.os.cpus().length-1 or just number
      addresses: ['127.0.0.1', '10.0.0.10'], // IP list or undefined for all
      applications: ['example'], // applications list or undefined for all
      services: {
        http: [80, 4001, 4002], // defune range - FORK for CPU
        https: [443],
        static: [80],
        ws: [4001, 4002],
        rpc: [4001, 4002]
      },
      ssl: {
        key: 'example.key',
        cert: 'example.cer'
      },
      // check: 'http://127.0.0.1/', // if we can get this page it means that another copy is running
      health: '5m', // health monitoring interval
      gcInterval: 0, // garbage collector interval
      fsWatch: '2s', // combine wached file system events if interval less then specified
      cookie: 'node', // Cookie name for loadbalancing (cookie value will be 'S1'+'N1')
      nagle: false, // Nagle algorithm
      slowTime: '1s', // request processing time to put it to slow log
      timeout: '30s', // critical request processing to return timeout error
      keepAlive: '5s', // keep alive timeout
    }
  },

  servers: {
    S1: {
      preset: 'default' // this will inherit parameters from preset
      // but we can override parameters here
    },
    S2: {
      host: '10.0.0.10', // server identifying IP address or undefined for any
      preset: 'default'
    }
  }

};
