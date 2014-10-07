module.exports = {

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

  plugins: 'array',

  sandbox: {
    global:   'array',
    api:      'array'
  },

  server: {
    _other:   '{{serverRecord}}'
  },

  serverRecord: {
    protocol: [ 'http', 'https' ],
    address:  'string',
    port:     'number',
    nagle:    'boolean',
    slowTime: 'string',
    key:      'string',
    cert:     'string'
  }

};
