'use strict';

const registry = {};
const indexByNpm = {};

const modules = {
  common: { type: 'preload', default: true },
  config: { type: 'preload', default: true },
  registry: { type: 'preload', default: true },

  require: { name: 'require', type: 'global' },
  console: { name: 'console', type: 'global', default: true },

  os: { npm: 'os', type: 'node', default: true },
  v8: { npm: 'v8', type: 'node' },
  vm: { npm: 'vm', type: 'node' },
  fs: { npm: 'fs', type: 'node', default: true },
  cp: { npm: 'child_process', type: 'node' },
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
  metasync: { npm: 'metasync', type: 'npm', default: true },
  zipStream: { npm: 'zip-stream', type: 'npm' },
  websocket: { npm: 'websocket', type: 'npm', default: true },
  multiparty: { npm: 'multiparty', type: 'npm' },
  acceptLanguage: { npm: 'accept-language', type: 'npm' },
  argon2: { npm: 'argon2', type: 'npm', default: true },

  metalog: { npm: 'metalog', type: 'npm', default: true },
  concolor: { npm: 'concolor', type: 'npm', default: true },
  test: { npm: 'metatests', type: 'npm', default: true },
  json: { type: 'global', default: true },
};

const names = Object.keys(modules);

for (const name of names) {
  const data = modules[name];
  if (!data.name) data.name = name;
  indexByNpm[data.npm] = data;
  //if (data.default) data.default[name] = data;
}

// Find module
//   name <string> npm or api name
// Returns: <Object> module api
const find = name => modules[name] || indexByNpm[name];

// Impress safe require
registry.require = name => {
  const module = find(name);
  if (!module) return null;
  const npmName = module.npm || module.name;
  let lib;
  try {
    lib = require(npmName);
  } catch (err) {
    lib = null;
  }
  return lib;
};

api.common = require('@metarhia/common');
api.Config = require('@metarhia/config');
api.sandboxedFs = require('sandboxed-fs');
api.json = JSON;

for (const name of names) {
  const data = modules[name];
  if (data.type === 'impress') {
    api[name] = {};
    require('./' + name);
  } else if (data.type !== 'preload') {
    api[name] = registry.require(name);
  }
}

module.exports = registry;
