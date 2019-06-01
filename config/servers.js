{

  // Server ports bind configuration
  // Each server is named server on specified address and port

  master: {
    protocol:  'jstp',
    transport: 'tcp',
    address:   '127.0.0.1',
    ports:     [250],
    slowTime:  Duration('1s'),
  },

  www: {
    protocol:  'http', // http or jstp
    transport: 'tcp', // tcp or tls for http; tcp, tls, ws or wss for jstp
    address:   '*',
    ports:     [80],
    // list [81, 82, 83]
    // range from..to [81,,91]
    // range from..count [81, [8]]
    // range from..cpu-n [81, [-2]]
    applications: ['example'], // undefined for all
    slowTime:  Duration('1s'),
    // inspect: 2000 // inspect Chrome developer tools
    shutdown:  Duration('5s'),
  },

  rpc: {
    protocol:  'jstp',
    transport: 'tcp',
    address:   '*',
    ports:     [3000, [1]], // Example: [81, [-1]]
    applications: ['example'],
    heartbeatInterval: Duration('2s'),
  },

  //secureRpc: {
  //  protocol:  'jstp',
  //  transport: 'tls',
  //  address:   '*',
  //  ports:     [4000, [1]],
  //  timeout:   Duration('30s'),
  //  key:       'example.key',
  //  cert:      'example.cer',
  //},

  webRpc: {
    protocol:  'jstp',
    transport: 'ws',
    address:   '*',
    ports:     [8000],
    applications: ['example'],
    slowTime:  Duration('1s'),
  },

  //local: {
  //  protocol:  'http',
  //  transport: 'tcp',
  //  address:   '127.0.0.1',
  //  ports:     [80],
  //  applications: ['example'],
  //Nagle algorithm, default true, set to false for latency optimization
  //  nagle:     true,
  //  timeout:   Duration('120s'),
  //  slowTime:  Duration('1s'),
  //},

  //ssl: {
  //  protocol:  'http',
  //  transport: 'tls',
  //  address:   '127.0.0.1',
  //  applications: ['example'],
  //  ports:     [443],
  //  key:       'example.key',
  //  cert:      'example.cer',
  //},

  //static: {
  //  protocol:  'http',
  //  transport: 'tcp',
  //  address:   '127.0.0.1',
  //  applications: ['example'],
  //  ports:     [8080],
  //  slowTime:  Duration('1s'),
  //}

}
