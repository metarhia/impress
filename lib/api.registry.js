'use strict';

api.registry = {};

// This registry included node.js core modules, Impress Application Server
// modules and external modules tested with Impress, wrapped as plugin or
// added to globel "api" namespace to be visible without require

api.registry.modules = {

  v8: { name: 'v8', core: true },
  exec: { name: 'exec', core: true },
  console: { name: 'console', сore: true },

  os: { name: 'os', npm: 'os', core: true },
  vm: { name: 'vm', npm: 'vm', core: true },
  fs: { name: 'fs', npm: 'fs', core: true },
  tls: { name: 'tls', npm: 'tls', core: true },
  net: { name: 'net', npm: 'net', core: true },
  dns: { name: 'dns', npm: 'dns', core: true },
  url: { name: 'url', npm: 'url', core: true },
  util: { name: 'util', npm: 'util', core: true },
  path: { name: 'path', npm: 'path', core: true },
  zlib: { name: 'zlib', npm: 'zlib', core: true },
  http: { name: 'http', npm: 'http', core: true },
  https: { name: 'https', npm: 'https', core: true },
  dgram: { name: 'dgram', npm: 'dgram', core: true },
  stream: { name: 'stream', npm: 'stream', core: true },
  domain: { name: 'domain', npm: 'domain', core: true },
  crypto: { name: 'crypto', npm: 'crypto', core: true },
  events: { name: 'events', npm: 'events', core: true },
  cluster: { name: 'cluster', npm: 'cluster', core: true },
  punycode: { name: 'punycode', npm: 'punycode', core: true },
  readline: { name: 'readline', npm: 'readline', core: true },
  querystring: { name: 'querystring', npm: 'querystring', core: true },
  childProcess: { name: 'childProcess', npm: 'child_process', core: true },
  stringDecoder: { name: 'stringDecoder', npm: 'string_decoder', core: true },

  csv: { name: 'csv', npm: 'csv', core: false },
  zmq: { name: 'zmq', npm: 'zmq', core: false },
  sass: { name: 'sass', npm: 'node-sass', core: false },
  iconv: { name: 'iconv', npm: 'iconv-lite', core: false },
  async: { name: 'async', npm: 'async', core: false },
  uglify: { name: 'uglify', npm: 'uglify-js', core: false },
  mkdirp: { name: 'mkdirp', npm: 'mkdirp', core: false },
  colors: { name: 'colors', npm: 'colors', core: false },
  zipstream: { name: 'zipStream', npm: 'zip-stream', core: false },
  websocket: { name: 'websocket', npm: 'websocket', core: false },
  multiparty: { name: 'multiparty', npm: 'multiparty', core: false },
    
  mongodb: { name: 'mongodb', npm: 'mongodb', core: false },
  memcached: { name: 'memcached', npm: 'memcached', core: false },

  pgsql: { name: 'pg', npm: '', core: false },
  mysql: { name: 'mysql', npm: '', core: false },
  mysqlUtilities: { name: 'mysql-utilities', npm: '', core: false },

  passport: { name: 'passport', npm: 'passport', core: false },
  passportGoogle: { name: 'passportGoogle', npm: 'passport-google-oauth', core: false },
  passportTwitter: { name: 'passportTwitter', npm: 'passport-twitter', core: false },
  passportFacebook: { name: 'passportFacebook', npm: 'passport-facebook', core: false },

};
