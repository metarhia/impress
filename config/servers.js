{

  // Server ports bind configuration
  // Each server is named server on specified address and port

  master: {
    protocol:  'jstp',
    transport: 'tcp',
    address:   '127.0.0.1',
    ports:     [250],
    slowTime:  '1s'
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
    slowTime:  '1s',
    timeout:   '30s',
    keepAlive: '5s',
    applications: ['example'] // undefined for all
  },

  rpc: {
    protocol:  'jstp',
    transport: 'tcp',
    address:   '*',
    ports:     [3000, [1]], // Example: [81, [-1]]
    slowTime:  '1s'
  },

  //secureRpc: {
  //  protocol:  'jstp',
  //  transport: 'tls',
  //  address:   '*',
  //  ports:     [4000, [1]],
  //  slowTime:  '1s',
  //  key:       'example.key',
  //  cert:      'example.cer'
  //},

  webRpc: {
    protocol:  'jstp',
    transport: 'ws',
    address:   '*',
    ports:     [8000],
    slowTime:  '1s'
  },

  //local: {
  //  protocol:  'http',
  //  transport: 'tcp',
  //  address:   '127.0.0.1',
  //  ports:     [80],
  // Nagle algorithm, default true, set to false for latency optimization
  //  nagle:     true,
  //  slowTime:  '1s',
  //  timeout:   '120s' // default 30s
  //},

  //ssl: {
  //  protocol:  'http',
  //  transport: 'tls',
  //  address:   '127.0.0.1',
  //  ports:     [443],
  //  key:       'example.key',
  //  cert:      'example.cer'
  //},

  //static: {
  //  protocol:  'http',
  //  transport: 'tcp',
  //  address:   '127.0.0.1',
  //  ports:     [8080],
  //  slowTime:  1000
  //}

}
