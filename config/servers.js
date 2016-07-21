{

  // Server ports bind configuration
  // Each server is named server on specified address and port

  master: {
    protocol:  'jstp',
    address:   '127.0.0.1',
    ports:     [250],
    slowTime:  '1s'
  },

  www: {
    protocol:  'http', // http, https, jstp, jstps
    address:   '*',
    ports:     [80],
    // list [81,82,83]
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
    address:   '*',
    ports:     [3000, [1]], // Example: [81, [-1]]
    slowTime:  '1s'
  },

  //secureRpc: {
  //  protocol:  'jstps',
  //  address:   '*',
  //  ports:     [4000, [1]],
  //  slowTime:  '1s',
  //  key:       'example.key',
  //  cert:      'example.cer'
  //},

  //local: {
  //  protocol: 'http',
  //  address:  '127.0.0.1',
  //  ports:    [80],
  //  nagle:    true, // Nagle algorithm, default true, set to false for latency optimization
  //  slowTime: '1s',
  //  timeout:  '120s' // default 30s
  //},

  //ssl: {
  //  protocol:  'https',
  //  address:   '127.0.0.1',
  //  ports:     [443],
  //  key:       'example.key',
  //  cert:      'example.cer'
  //},

  //static: {
  //  protocol:  'http',
  //  address:   '127.0.0.1',
  //  ports:     [8080],
  //  slowTime:  1000
  //}

}
