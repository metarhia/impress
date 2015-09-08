module.exports = {

  scale: {
    check:      '[string]',

    cloud:      'string',
    transport:  '(tcp,ipc,zmq)',
    instance:   '(standalone,controller,server)',

    host:       'string',
    rpcPort:    '250:number',
    subPort:    '251:number',

    cluster:    'string',
    cookie:     'node:string',
    strategy:   '(single,specialization,multiple,sticky)',
    workers:    '1:number',

    health:     '5s:duration',
    nagle:      'false:boolean',
    gcInterval: '10m:duration',
    watchInterval: '2s:duration',
    waf:        '{waf}'
  },

  waf: {
    enabled: 'false:boolean',
    limits:  '{limits}'
  },

  limits: {
    ip:   '20:number',
    sid:  '10:number',
    host: '100:number',
    url:  '50:number',
    app:  '200:number',
    srv:  '500:number'
  },

  log: {
    keepDays:       '100:number',
    writeInterval:  '5s:duration',
    writeBuffer:    '64kb:size',
    applicationLog: 'false:boolean',
    serverLog:      'true:boolean',
    files:          '[array]',
    stdout:         '[array]'
  },

  sandbox: {
    global: '[array]',
    api:    '[array]'
  },

  servers: '{{server}}',

  server: {
    protocol:  '(http,https)',
    address:   'string',
    port:      'number',
    nagle:     'false:boolean',
    slowTime:  '4s:duration',
    timeout:   '30s:duration',
    keepAliveTimeout: '5s:duration',
    key:       '[string]',
    cert:      '[string]'
  }

};
