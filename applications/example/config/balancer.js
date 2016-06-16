{
  // Application specific configuration
  // You can place js file in this directory with your own structure and it will be loaded as an application config section

  servers: {
    S0: {
      ssl: false,
      host: '127.0.0.1',
      ports: [80]
      // 
      // Notes:
      //
      // 80 port is good just for example and tests,
      // we propose to use 4000+ ports as in following example
      // especially for "bundle" scale strategy
      // so port 80 will be always free for HTTP API, not for WS
      //
      // ports: [4000, 4001, 4002, 4003]
      //
    }
  }

}