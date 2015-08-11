// Modules available in application sandbox

module.exports = {

  // Following identifiers will be visible in sandbox global
  // There is no need to uncomment this if you you do not want to override list
  // You can hide 
  // 
  // global: [
  //  'require', 'console', 'Buffer', 'SlowBuffer', 'process',
  //  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'
  // ],

  // Following identifiers will be visible in sandbox as api.<name>
  //
  api: [
    // Node internal modules
    'console', 'os', 'fs', 'tls','net', 'dns', 'url', 'util', 'path', 'zlib', 'http', 'https', 'dgram',
    'stream', 'buffer', 'domain', 'crypto', 'events', 'punycode', 'readline', 'querystring', 'stringDecoder',

    // Impress API modules
    'db',
    'con',
    'impress',
    'registry',
    'definition',

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
  ]

};
