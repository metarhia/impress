({

  www: {
    protocol: 'http',
    address: '*',
    ports: [80],
    // [81, 82, 83]
    // Range(81, 91)
    // Range(8).start(81)
    // Range(-2).start(81) CPU count - 2
    timeout: Duration('120s'),
    slowTime: Duration('1s'),
    nagle: true, // Nagle algorithm
    api: flase, // Allow API access
    static: true, // Serve static
    // set HTTP header Access-Control-Allow-Origin (default: not set)
    allowOrigin: '*',
    // Hosts and/or IPs array to be handled by application
    // Wildcard '*' is allowed for masking random or empty substring
    // '127.0.0.1' or any IP
    // 'domain.com' or wildcard '*.domain.com'
    hosts: ['*'],
  },

  api: {
    protocol: 'http',
    address: '*',
    ports: [81, 82, 83],
    timeout: Duration('120s'),
    slowTime: Duration('1s'),
    nagle: true,
    api: true,
    static: false,
    hosts: ['*'],
  },

});
