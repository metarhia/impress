// Modules available in application sandbox

module.exports = {

  api: [
    // Node internal modules
    'os', 'cluster', 'domain', 'crypto', 'util',
    'net', 'http', 'https', 'dgram', 'dns', 'tls',
    'url', 'path', 'punycode', 'querystring', 'string_decoder',
    'fs', 'stream', 'zlib', 'events', 'readline', 'npm',

    // Impress API modules
    'definition',

    // Additional modules
    'async',
    'iconv',
    'colors',
    'geoip',
    'nodemailer',
    'mkdirp',
    'request',
    'zipstream',
    'stringify',
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
