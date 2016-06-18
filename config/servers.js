{

  // Server ports bind configuration
  // Each server is named server on specified address and port

  www: {
    protocol:  'http', // http, https, jstp, jstps
    address:   '*',
    port:      80, // [81,82,83], [81,,91], { start: 81, end: 91 }
                   // { start: 81, count: 8 } { start: 81, count: -2 }
    slowTime:  '1s',
    timeout:   '30s',
    keepAliveTimeout: '5s'
  },

  rpc: {
    protocol:  'jstp',
    address:   '*',
    port:      [81, 82],
    slowTime:  '1s'
  },

  //local: {
  //  protocol: 'http',
  //  address:  '127.0.0.1',
  //  port:     80,
  //  nagle:    true, // Nagle algorithm, default true, set to false for latency optimization
  //  slowTime: '1s',
  //  timeout:  '120s' // default 30s
  //},

  //ssl: {
  //  protocol:  'https',
  //  address:   '127.0.0.1',
  //  port:      443,
  //  key:       'example.key',
  //  cert:      'example.cer'
  //},

  //static: {
  //  protocol:  'http',
  //  address:   '127.0.0.1',
  //  port:      8080,
  //  slowTime:  1000
  //}

}