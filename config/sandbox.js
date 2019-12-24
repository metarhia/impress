({
  // Modules available in application sandbox
  // Following identifiers will be visible in sandbox as api.<name>
  api: [
    // Node internal modules
    'os', 'fs',  'url', 'util', 'path', 'v8', 'vm', 'stream',
    'readline', 'querystring', 'process', 'timers', 'events',
    'net', 'tls', 'dns', 'http', 'https', 'dgram', 'zlib',
    'crypto', 'buffer',

    // Metarhia modules
    'common', 'metasync',

    // 3d party modules
    'csvStringify',
    'zipStream', // npm module zip-stream
  ]
});
