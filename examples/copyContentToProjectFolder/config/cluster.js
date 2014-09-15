// Startup and initializing configuration

module.exports = {
  check:      'http://127.0.0.1/', // if we can get this page it means that another copy is running
  name:       'C1',                // Cluster name to identify it in loadbalancing infrastructure
  cookie:     'node',              // Cookie name for loadbalancing (cookie value will be 'C1'+'N1')
  strategy:   'single',
    // 'single'         - one process (no master and workers)
    // 'specialization' - multiple processes, one master and different workers for each server (master should not listen ports)
    // 'multiple'       - multiple processes, one master and identical workers with no sticky (master should listen ports)
    // 'sticky'         - multiple processes, one master and workers with sticky by IP (master should listen ports)
    //
  workers:    api.os.cpus().length-1, // worker count, e.g. os.cpus().length-1 or just number
  nagle:      false,     // Nagle algorithm
  gcInterval: 0,         // garbage collector interval '1h' - 1 hour, '10m' - 10 minutes
};
