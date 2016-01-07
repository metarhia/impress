module.exports = {

  cloud: {
    cloud: 'string',
    rpc:   '{rpc}',
  },

  rpc: {
    transport: '(tcp,ipc,zmq)',
    port:      '250:number'
  },

  sandbox: {
    global: '[array]',
    api:    '[array]'
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

  preset: {
    instance:     '(standalone,controller,server)',
    strategy:     '(single,bundle,cluster,sticky)',
    workers:      '1:number',

    addresses:    '[array]',
    applications: '[array]',

    check:        '[string]',
    health:       '5s:duration',
    gcInterval:   '10m:duration',
    fsWatch:      '2s:duration',
    cookie:       'node:string',
    nagle:        'false:boolean',
    slowTime:     '4s:duration',
    timeout:      '30s:duration',
    keepAlive:    '5s:duration',

    services:     '{services}',
    ssl:          '{ssl}'
  },

  server: {
    host:         '[string]',
    preset:       '[string]',

    instance:     '(standalone,controller,server)',
    strategy:     '(single,bundle,cluster,sticky)',
    workers:      '1:number',

    addresses:    '[array]',
    applications: '[array]',

    check:        '[string]',
    health:       '5s:duration',
    gcInterval:   '10m:duration',
    fsWatch:      '2s:duration',
    cookie:       'node:string',
    nagle:        'false:boolean',
    slowTime:     '4s:duration',
    timeout:      '30s:duration',
    keepAlive:    '5s:duration',

    services:     '{services}',
    ssl:          '{ssl}'
  },

  services: {
    http:   '[array]',
    https:  '[array]',
    static: '[array]',
    ws:     '[array]',
    sse:    '[array]',
    rpc:    '[array]'
  },

  ssl: {
    key:  '[string]',
    cert: '[string]'
  }

};
