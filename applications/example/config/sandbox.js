({
  // Modules available in application sandbox

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
  ]
});
