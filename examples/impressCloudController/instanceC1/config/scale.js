// Server scale configuration

module.exports = {
  cloud:      'PrivateCloud',    // cloud name
  instance:   'server',      // cloud instance type: standalone, controller, server

  controller: 'tcp://127.0.0.1', // cloud controller IP address
  subPort:    3000,              // bublisher/subscriber port
  reqPort:    3001,              // request/reply port

  cluster:    'auto',            // Cluster name to identify it in loadbalancing infrastructure
  cookie:     'node',            // Cookie name for loadbalancing (cookie value will be 'C1'+'N1')
  strategy:   'multiple',

  workers:    api.os.cpus().length-1, // worker count, e.g. api.os.cpus().length-1 or just number

  health:     '5s',      // health monitoring interval
  nagle:      false,     // Nagle algorithm
  gcInterval: 0,         // garbage collector interval '1h' - 1 hour, '10m' - 10 minutes
  watchInterval: 2000,   // combine wached file system events if interval less then specified
}
