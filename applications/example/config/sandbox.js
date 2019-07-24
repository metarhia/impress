{
  // Modules available in application sandbox

  // Following identifiers will be visible in sandbox global
  // There is no need to uncomment this if you you do not want to override list
  // You can hide
  //
  // global: [
  //  'Buffer',
  //  'setTimeout', 'clearTimeout', 'setInterval',
  //  'clearInterval', 'setImmediate', 'clearImmediate'
  // ],

  // Following identifiers will be visible in sandbox as api.<name>
  //
  api: [
    // Node internal modules
    'os', 'fs', 'sd', 'tls', 'net', 'dns', 'url', 'util', 'path',
    'zlib', 'http', 'https', 'dgram', 'stream', 'buffer', 'domain', 'crypto',
    'events', 'readline', 'querystring', 'process', 'timers',

    // Impress API modules
    'db', 'con', 'json', 'common', 'registry',

    // Preinstalled modules
    'csvStringify',
    'iconv',
    'zipStream', // npm module zip-stream
    'websocket',

    // Metarhia modules
    'jstp',
    'metasync',
    'metaschema',
    'globalstorage',

    // Additional modules
    //'mkdirp',
    //'geoip',
    //'nodemailer',
    //'request',
  ],

  // Import from other applications
  //import: {
  //  appName: { // application name
  //    'api.nameExport': 'api.nameImport' // name mapping hash
  //  }
  //},

  // Allow to export to other applications
  //export: [
  //  'api.nameExport'
  //]

}
