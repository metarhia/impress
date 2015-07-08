module.exports = {
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
    'zipstream',
    'csv'
  ]
};
