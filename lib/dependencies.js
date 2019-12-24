'use strict';

const apiModules = [
  'v8', 'vm', 'os', 'events', 'stream', 'timers', 'fs', 'util',
  'url', 'path', 'crypto', 'zlib', 'readline', 'querystring',
  'net', 'dgram', 'dns', 'tls', 'http', 'https',
  'metasync', 'metalog', 'concolor', 'metatests',
  'websocket', 'multiparty', 'argon2',
];

api.cp = require('child_process');
api.wt = require('worker_threads');

api.common = require('@metarhia/common');
api.Config = require('@metarhia/config');

api.csvStringify = require('csv-stringify/lib/es5');
api.zipStream = require('zip-stream');
api.acceptLanguage = require('accept-language');
api.sandboxedFs = require('sandboxed-fs');

for (const moduleName of apiModules) {
  api[moduleName] = require(moduleName);
}

Object.assign(global, require('./constants'));

const impressModules = [
  'application', 'client', 'console', 'scripts', 'workers',
  'files', 'extensions', 'scheduler', 'security',
];

for (const moduleName of impressModules) {
  api[moduleName] = require('./' + moduleName);
}
