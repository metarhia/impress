// Cloud and health configuration

module.exports = {

  // check:      'http://127.0.0.1/', // if we can get this page it means that another copy is running

  cloud: 'PrivateCloud', // cloud name
  transport: 'tcp', // RPC transport: tcp, ipc, zmq

  rpcPort: 250, // cloud controller tcp port for TCP and ZMQ
  subPort: 251, // bublisher/subscriber port for ZMQ

  health: '5m', // health monitoring interval '5s'
  gcInterval: 0, // garbage collector interval '1h' - 1 hour, '10m' - 10 minutes
  fsWatch: '2s', // combine wached file system events if interval less then specified
  cookie: 'node', // Cookie name for loadbalancing (cookie value will be 'S1'+'N1')
  nagle: false, // Nagle algorithm
  slowTime: '1s', // request processing time to put it to slow log
  timeout: '30s', // critical request processing to return timeout error
  keepAlive: '5s', // keep alive timeout

  ssl: {
    key: 'example.key',
    cert: 'example.cer'
  },

  servers: {
    S1: {
      instance: 'controller',
      strategy: 'bundle',
      services: {
        http: [80, 4001, 4002],
        static: [81],
        ws: [4001, 4002],
        rpc: [4001, 4002],
      }
    },
    S2: {
      instance: 'server', // cloud instance type: standalone, controller, server
      strategy: 'bundle',
      // single - one process (no master and workers)
      // bundle - multiple processes, one master and different workers for each server (master should not listen ports)
      // cluster - multiple processes, one master and identical workers with no sticky (master should listen ports)
      // sticky - multiple processes, one master and workers with sticky by IP (master should listen ports)
      workers: 1, // worker count, e.g. api.os.cpus().length-1 or just number
      addresses: ['10.0.0.10'], // IP list or no value for all
      applications: ['example'], // applications list or no value for all
      services: {
        http: [80, 81, 82, 83],
        https: [443]
      }
    }
  },

  // Web Application Firewall config
  waf: {
    enabled: false,
    limits: { // limit concurent connection count
      ip: 20,  // per client ip
      sid: 10,  // per user session
      host: 100, // per host name
      url: 50,  // per url
      app: 200, // per application
      srv: 500  // per server port
    }
  },

};
