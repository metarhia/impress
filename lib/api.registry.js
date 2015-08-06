'use strict';

api.registry = {};

// This registry included node.js core modules, Impress Application Server
// modules and external modules tested with Impress, wrapped as plugin or
// added to globel "api" namespace to be visible without require

api.registry.modules = {

  v8: { name: 'v8', type: 'v8' },
  exec: { name: 'exec', type: 'core' },
  console: { name: 'console', type: 'global' },

  db: { name: 'db', type: 'impress', default: true },
  impress: { name: 'impress', type: 'impress', default: true },
  registry: { name: 'registry', type: 'impress', default: true },
  definition: { name: 'definition', type: 'impress', default: true },

  os: { name: 'os', npm: 'os', type: 'core', default: true },
  vm: { name: 'vm', npm: 'vm', type: 'core' },
  fs: { name: 'fs', npm: 'fs', type: 'core', default: true },
  tls: { name: 'tls', npm: 'tls', type: 'core', default: true },
  net: { name: 'net', npm: 'net', type: 'core', default: true },
  dns: { name: 'dns', npm: 'dns', type: 'core', default: true },
  url: { name: 'url', npm: 'url', type: 'core', default: true },
  util: { name: 'util', npm: 'util', type: 'core', default: true },
  path: { name: 'path', npm: 'path', type: 'core', default: true },
  zlib: { name: 'zlib', npm: 'zlib', type: 'core', default: true },
  http: { name: 'http', npm: 'http', type: 'core', default: true },
  https: { name: 'https', npm: 'https', type: 'core', default: true },
  dgram: { name: 'dgram', npm: 'dgram', type: 'core', default: true },
  stream: { name: 'stream', npm: 'stream', type: 'core', default: true },
  domain: { name: 'domain', npm: 'domain', type: 'core', default: true },
  crypto: { name: 'crypto', npm: 'crypto', type: 'core', default: true },
  events: { name: 'events', npm: 'events', type: 'core', default: true },
  cluster: { name: 'cluster', npm: 'cluster', type: 'core' },
  punycode: { name: 'punycode', npm: 'punycode', type: 'core', default: true },
  readline: { name: 'readline', npm: 'readline', type: 'core' },
  querystring: { name: 'querystring', npm: 'querystring', type: 'core', default: true },
  childProcess: { name: 'childProcess', npm: 'child_process', type: 'core' },
  stringDecoder: { name: 'stringDecoder', npm: 'string_decoder', type: 'core', default: true },

  csv: { name: 'csv', npm: 'csv', type: 'npm', default: true },
  zmq: { name: 'zmq', npm: 'zmq', type: 'npm' },
  sass: { name: 'sass', npm: 'node-sass', type: 'npm' },
  geoip: { name: 'geoip', npm: 'geoip-lite', type: 'npm' },
  iconv: { name: 'iconv', npm: 'iconv-lite', type: 'npm', default: true },
  async: { name: 'async', npm: 'async', type: 'npm', default: true },
  uglify: { name: 'uglify', npm: 'uglify-js', type: 'npm' },
  mkdirp: { name: 'mkdirp', npm: 'mkdirp', type: 'npm' },
  colors: { name: 'colors', npm: 'colors', type: 'npm' },
  request: { name: 'request', npm: 'request', type: 'npm' },
  zipStream: { name: 'zipStream', npm: 'zip-stream', type: 'npm' },
  websocket: { name: 'websocket', npm: 'websocket', type: 'npm' },
  multiparty: { name: 'multiparty', npm: 'multiparty', type: 'npm' },
  nodemailer: { name: 'nodemailer', npm: 'nodemailer', type: 'npm' },
    
  mongodb: { name: 'mongodb', npm: 'mongodb', type: 'npm' },
  memcached: { name: 'memcached', npm: 'memcached', type: 'npm' },

  pgsql: { name: 'pgsql', npm: 'pg', type: 'npm' },
  mysql: { name: 'mysql', npm: 'mysql', type: 'npm' },
  mysqlUtilities: { name: 'mysql-utilities', npm: 'mysql-utilities', type: 'npm' },

  passport: { name: 'passport', npm: 'passport', type: 'npm' },
  passportGoogle: { name: 'passportGoogle', npm: 'passport-google-oauth', type: 'npm' },
  passportTwitter: { name: 'passportTwitter', npm: 'passport-twitter', type: 'npm' },
  passportFacebook: { name: 'passportFacebook', npm: 'passport-facebook', type: 'npm' },

};

// Build indexes:
//   api.registry.modules - initial api registry records
//   api.registry.names - api module names array of string
//   api.registry.default - default api modules for application sandbox
//   api.registry.defaultNames - default api modules names array of string
//   api.registry.indexByNpm - hash keyed by npm module name
//   api.registry.indexByType - hash keyed by api module name, hash values are array of string
//
api.registry.buildIndex = function() {
  api.registry.default = {};
  api.registry.indexByNpm = {};
  api.registry.indexByType = {};

  var m, name, type;
  for (name in api.registry.modules) {
    m = api.registry.modules[name];
    api.registry.indexByNpm[m.npm] = m;
    if (!api.registry.indexByType[m.type]) api.registry.indexByType[m.type] = [];
    api.registry.indexByType[m.type].push(name);
    if (m.default) api.registry.default[name] = m;
  }

  api.registry.names = Object.keys(api.registry.modules);
  api.registry.defaultNames = Object.keys(api.registry.default);
};
api.registry.buildIndex();

// Get npm module name by api module name
//
api.registry.npmNameToApiName = function(npmName) {
  var m = api.registry.indexByNpm[npmName];
  return m ? m.name : undefined;
};

// Get api module name by npm module name
//
api.registry.apiNameToNpmName = function(apiName) {
  var m = api.registry.modules[apiName];
  return m ? m.npm : undefined;
};

// Get api module name by npm module name
//   name - npm name string or api name string
//   return - registry record
//
api.registry.find = function(name) {
  var m = api.registry.modules[name];
  if (m) return m;
  else return api.registry.indexByNpm[name];
};
