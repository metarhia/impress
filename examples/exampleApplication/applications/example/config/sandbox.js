// Modules available in application sandbox

module.exports = {

  // Following identifiers will be visible in sandbox global
  // There is no need to uncomment this if you you do not want to override list
  // You can hide 
  // 
  // global: [
  //  'require', 'console', 'Buffer', 'process',
  //  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'
  // ],

  // Following identifiers will be visible in sandbox as api.<name>
  //
  api: [
    // Node internal modules
    'os', 'cluster', 'domain', 'crypto', 'util',
    'net', 'http', 'https', 'dgram', 'dns', 'tls',
    'url', 'path', 'punycode', 'querystring', 'string_decoder',
    'fs', 'stream', 'zlib', 'events', 'readline',

    // Impress API modules
    'impress',
    'definition',

    // Preinstalled modules
    'async',
    'iconv',
    'colors',
    'mkdirp',
    'zipstream', // npm modile zip-stream
    'stringify', // npm module json-stringify-safe
    'csv',

    // Additional modules
    // 'geoip',
    // 'nodemailer',
    // 'request',
    // 'npm',

    // Passport providers
    // 'passport', 'passport-google-oauth', 'passport-twitter', 'passport-facebook'
  ],

  // Plugins that should be mixedin into application and Client instances
  plugins: [
    'impress.events',
    'impress.sse',
    'impress.websocket',
    'impress.rpc',
    //'impress.passport',
    'impress.state',
  ]

};
