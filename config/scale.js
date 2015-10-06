// Cloud and health configuration

module.exports = {
  // check:      'http://127.0.0.1/', // if we can get this page it means that another copy is running

  cloud:      'PrivateCloud',    // cloud name
  transport:  'tcp',             // RPC transport: tcp, ipc, zmq

  instance:   'controller', // cloud instance type: standalone, controller, server
  //instance:   'server',
  //instance:   'standalone',

  host:       '127.0.0.1',       // cloud controller ip or host name
  rpcPort:     250,              // cloud controller tcp port for TCP and ZMQ
  subPort:     251,              // bublisher/subscriber port for ZMQ

  cluster:    'C1',              // Cluster name to identify it in loadbalancing infrastructure
  cookie:     'node',            // Cookie name for loadbalancing (cookie value will be 'C1'+'N1')
  strategy:   'multiple',
    // 'single'   - one process (no master and workers)
    // 'bundle'   - multiple processes, one master and different workers for each server (master should not listen ports)
    // 'multiple' - multiple processes, one master and identical workers with no sticky (master should listen ports)
    // 'sticky'   - multiple processes, one master and workers with sticky by IP (master should listen ports)

  workers: api.os.cpus().length, // worker count, e.g. api.os.cpus().length-1 or just number

  waf: { // Web Application Firewall config
    enabled: false,
    limits: { // limit concurent connection count
      ip:   20,  // per client ip
      sid:  10,  // per user session
      host: 100, // per host name
      url:  50,  // per url
      app:  200, // per application
      srv:  500  // per server port
    }
  },

  health:        '5m',   // health monitoring interval '5s'
  nagle:         false,  // Nagle algorithm
  gcInterval:    0,      // garbage collector interval '1h' - 1 hour, '10m' - 10 minutes
  watchInterval: '2s'    // combine wached file system events if interval less then specified

};
