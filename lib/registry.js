'use strict';

// Global API namespace for Impress Application Server

global.api = {};

// API registry for Impress Application Server

const registry = {};
api.registry = registry;

// This registry included node.js core modules, Impress Application Server
// modules and external modules tested with Impress, wrapped as plugin or
// added to global "api" namespace to be visible without require

api.registry.modules = {

  common: { type: 'preload', default: true },
  registry: { type: 'preload', default: true },

  require: { name: 'require', type: 'global' },
  console: { name: 'console', type: 'global', default: true },

  os: { npm: 'os', type: 'node', default: true },
  v8: { npm: 'v8', type: 'node' },
  vm: { npm: 'vm', type: 'node' },
  fs: { npm: 'fs', type: 'node', default: true },
  cp: { npm: 'child_process', type: 'node' },
  wt: { npm: 'worker_threads', type: 'node' },
  sd: { npm: 'string_decoder', type: 'node', default: true },
  tls: { npm: 'tls', type: 'node', default: true },
  net: { npm: 'net', type: 'node', default: true },
  dns: { npm: 'dns', type: 'node', default: true },
  url: { npm: 'url', type: 'node', default: true },
  util: { npm: 'util', type: 'node', default: true },
  path: { npm: 'path', type: 'node', default: true },
  zlib: { npm: 'zlib', type: 'node', default: true },
  http: { npm: 'http', type: 'node', default: true },
  https: { npm: 'https', type: 'node', default: true },
  dgram: { npm: 'dgram', type: 'node', default: true },
  timers: { npm: 'timers', type: 'node', default: true },
  stream: { npm: 'stream', type: 'node', default: true },
  buffer: { npm: 'buffer', type: 'node', default: true },
  crypto: { npm: 'crypto', type: 'node', default: true },
  events: { npm: 'events', type: 'node', default: true },
  readline: { npm: 'readline', type: 'node' },
  querystring: { npm: 'querystring', type: 'node', default: true },

  csvStringify: { npm: 'csv-stringify/lib/es5', type: 'npm', default: true },
  jstp: { npm: '@metarhia/jstp', type: 'npm', default: true },
  mdsf: { npm: 'mdsf', type: 'npm', default: true },
  geoip: { npm: 'geoip-lite', type: 'npm' },
  iconv: { npm: 'iconv-lite', type: 'npm', default: true },
  mkdirp: { npm: 'mkdirp', type: 'npm' },
  request: { npm: 'request', type: 'npm' },
  metasync: { npm: 'metasync', type: 'npm', default: true },
  zipStream: { npm: 'zip-stream', type: 'npm' },
  websocket: { npm: 'websocket', type: 'npm', default: true },
  metaschema: { npm: 'metaschema', type: 'npm', default: true },
  multiparty: { npm: 'multiparty', type: 'npm' },
  nodemailer: { npm: 'nodemailer', type: 'npm' },
  acceptLanguage: { npm: 'accept-language', type: 'npm' },

  gs: { npm: 'globalstorage', type: 'npm', dependencies: 'db' },
  mongodb: { npm: 'mongodb', type: 'npm', dependencies: 'db' },
  pgsql: { npm: 'pg', type: 'npm', dependencies: 'db' },
  oracle: { npm: 'oracledb', type: 'npm', dependencies: 'db' },
  mysql: { npm: 'mysql', type: 'npm', dependencies: 'db' },
  mysqlUtilities: {
    npm: 'mysql-utilities', type: 'npm', dependencies: 'mysql'
  },

  metalog: { npm: 'metalog', type: 'npm', default: true },
  concolor: { npm: 'concolor', type: 'npm', default: true },
  con: { type: 'impress', default: true },
  test: { npm: 'metatests', type: 'npm', default: true },
  json: { type: 'global', default: true },
  db: { type: 'impress', default: true },

  argon2: { npm: 'argon2', type: 'npm', default: true },
};

// Build indexes in api.registry:
//   modules - initial api registry records
//   names - api module names array of string
//   default - default api modules for application sandbox
//   defaultNames - default api modules names array of string
//   indexByNpm - hash keyed by npm module name
//   indexByType - hash keyed by api module name, hash values: array of string
api.registry.buildIndex = () => {
  registry.default = {};
  registry.indexByNpm = {};
  registry.indexByType = {};

  for (const name in registry.modules) {
    const m = registry.modules[name];
    m.name = name;
    registry.indexByNpm[m.npm] = m;
    if (!registry.indexByType[m.type]) {
      registry.indexByType[m.type] = [];
    }
    registry.indexByType[m.type].push(name);
    if (m.default) {
      registry.default[name] = m;
    }
  }

  registry.names = Object.keys(registry.modules);
  registry.defaultNames = Object.keys(registry.default);
};
api.registry.buildIndex();

// Get api name by npm name
//   npmName <string> api module name
// Returns: npm module name
api.registry.npmNameToApiName = npmName => {
  const m = registry.indexByNpm[npmName];
  return m ? m.name : undefined;
};

// Get npm name by api name
//   npmName <string> api module name
// Returns: api module name
api.registry.apiNameToNpmName = apiName => {
  const m = registry.modules[apiName];
  return m ? m.npm : undefined;
};

// Find module
//   name <string> npm or api name
// Returns: <Object> api module name
api.registry.find = name => registry.modules[name] ||
  registry.indexByNpm[name];

// Impress safe require
api.registry.require = moduleName => {
  const mr = registry.find(moduleName);
  const npmName = mr ? mr.npm || mr.name : moduleName;
  let lib;
  try {
    lib = require(npmName);
  } catch (err) {
    lib = null;
  }
  return lib;
};

api.common = require('@metarhia/common');
api.sandboxedFs = require('sandboxed-fs');
api.json = JSON;

for (const moduleName in registry.modules) {
  const moduleData = registry.modules[moduleName];
  if (moduleData.type === 'impress') {
    api[moduleName] = {};
    require('./' + moduleName);
  } else if (moduleData.type === 'node') {
    api[moduleName] = registry.require(moduleName);
  } else if (moduleData.type === 'npm') {
    api[moduleName] = registry.require(moduleName);
  }
}
