module.exports = {

  scale: {
    check:      '[string]',

    cloud:      'string',
    transport:  '(tcp,ipc,zmq)',

    rpcPort:    '250:number',
    subPort:    '251:number',

    health:     '5s:duration',
    gcInterval: '10m:duration',
    fsWatch:    '2s:duration',
    cookie:     'node:string',
    nagle:      'false:boolean',
    slowTime:   '4s:duration',
    timeout:    '30s:duration',
    keepAlive:  '5s:duration',

    waf:        '{waf}',
    servers:    '{{server}}',
    ssl:        '{ssl}'
  },

  waf: {
    enabled: 'false:boolean',
    limits:  '{limits}'
  },

  ssl: {
    key:  '[string]',
    cert: '[string]'
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

  server: {
    instance:     '(standalone,controller,server)',
    strategy:     '(single,bundle,cluster,sticky)',
    workers:      '1:number',
    addresses:    '[array]',
    applications: '[array]',
    services:     '{services}'
  },

  services: {
    http:   '[array]',
    https:  '[array]',
    static: '[array]',
    ws:     '[array]',
    sse:    '[array]',
    rpc:    '[array]'
  }

};
