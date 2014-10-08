module.exports = {

  config: {
    cloud:   '{cloud}',
    cluster: '{cluster}',
    log:     '{log}',
    plugins: 'array',
    sandbox: '{sandbox}',
    servers: '{servers}'
  },

  cloud: {
    name:       'string',
    type:       'string',
    controller: 'string',
    pubSubPort: 'string',
    reqResPort: 'string',
    health:     'string'
  },

  cluster: {
    check:      'string',
    name:       'string',
    cookie:     'string',
    strategy:   [ 'single', 'specialization', 'multiple', 'sticky' ],
    workers:    'number',
    nagle:      'boolean',
    gcInterval: 'number'
  },

  log: {
    keepDays:       'number',
    writeInterval:  'string',
    writeBuffer:    'number',
    applicationLog: 'boolean',
    serverLog:      'boolean'
  },

  sandbox: {
    global:   'array',
    api:      'array'
  },

  servers: {
    _other:   '{{server}}'
  },

  server: {
    protocol: [ 'http', 'https' ],
    address:  'string',
    port:     'number',
    nagle:    'boolean',
    slowTime: 'string',
    key:      'string',
    cert:     'string'
  }

};
