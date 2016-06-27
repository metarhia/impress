module.exports = {

  scale: {
    check:      '[string]',

    cloud:      'string',
    instance:   '(standalone,controller,server)',

    host:       'string',
    port:       '250:number',
    key:        '[string]',

    cluster:    'string',
    cookie:     'node:string',

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
    protocol:  '(http,https,jstp,jstps)',
    address:   'string',
    ports:     '[array]',
    bundle:    'false:boolean',
    nagle:     'false:boolean',
    slowTime:  '4s:duration',
    timeout:   '30s:duration',
    keepAliveTimeout: '5s:duration',
    key:       '[string]',
    cert:      '[string]'
  }

};
