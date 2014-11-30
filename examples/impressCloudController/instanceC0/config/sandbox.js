// Modules available in application sandbox

module.exports = {

  api: [
    // Node internal modules
    'os', 'cluster', 'domain', 'crypto', 'util',
    'net', 'http', 'https', 'dgram', 'dns', 'tls',
    'url', 'path', 'punycode', 'querystring', 'string_decoder',
    'fs', 'stream', 'zlib', 'events', 'readline',

    // Impress API modules
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

  // Plugins to be loaded using require by Impress
  plugins: [
    'impress.log',
    'impress.security',
    'impress.scale',
    'impress.events',
    'impress.sse',
  ]

}
