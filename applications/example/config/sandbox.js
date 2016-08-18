{
  // Modules available in application sandbox

  // Following identifiers will be visible in sandbox global
  // There is no need to uncomment this if you you do not want to override list
  // You can hide
  //
  // global: [
  //  'require', 'console', 'Buffer', 'SlowBuffer',
  //  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'
  // ],

  // Following identifiers will be visible in sandbox as api.<name>
  //
  api: [
    // Node internal modules
    'console', 'os', 'fs', 'sd', 'tls','net', 'dns', 'url', 'util', 'path', 'zlib', 'http', 'https', 'dgram',
    'stream', 'buffer', 'domain', 'crypto', 'events', 'punycode', 'readline', 'querystring', 'process', 'timers',

    // Impress API modules
    'db', 'con', 'jstp', 'json', 'common', 'impress', 'metasync', 'registry', 'definition',

    // Preinstalled modules
    'csv',
    'async',
    'iconv',
    'colors',
    'zipStream', // npm module zip-stream

    // Additional modules
    //'mkdirp',
    //'geoip',
    //'nodemailer',
    //'request',

    // Passport providers
    //'passport',         // npm install passport
    //'passportGoogle',   // npm install passport-google-oauth
    //'passportTwitter',  // npm install passport-twitter
    //'passportFacebook'  // npm install passport-facebook
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