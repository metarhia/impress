{

  scale: {
    check:        '[string]',

    cloud:        'string',
    server:       'string',
    instance:     '(standalone,controller,server)',
    controller:   '{controller}',

    key:          '[string]',
    cookie:       'node:string',

    health:       '5s:duration',
    nagle:        'false:boolean',
    gc:           '10m:duration',
    watch:        '2s:duration',
    firewall:     '{firewall}',

    characters:   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:string',
    length:       '64:number',
  },

  controller: {
    host: 'string',
    port: 'number'
  },

  firewall: {
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
    protocol:     '(http,jstp)',
    transport:    '(tcp,tls,ws,wss)',
    address:      'string',
    ports:        '[array]',
    bundle:       'false:boolean',
    nagle:        'false:boolean',
    slowTime:     '4s:duration',
    timeout:      '30s:duration',
    keepAlive:    '5s:duration',
    heartbeat:    '[duration]',
    key:          '[string]',
    cert:         '[string]',
    applications: '[array]'
  }

}
