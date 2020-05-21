'use strict';

const api = { common: require('./common.js') };
const internals = [
  'util', 'child_process', 'worker_threads', 'os', 'v8', 'vm', 'path', 'url',
  'assert', 'querystring', 'string_decoder', 'perf_hooks', 'async_hooks',
  'timers', 'events', 'stream', 'fs', 'crypto', 'zlib',
  'dns', 'net', 'tls', 'http', 'https', 'http2', 'dgram',
];

for (const name of internals) api[name] = Object.freeze(require(name));
api.process = process;
api.childProcess = api['child_process'];
api.StringDecoder = api['string_decoder'];
api.perfHooks = api['perf_hooks'];
api.asyncHooks = api['async_hooks'];
api.worker = api['worker_threads'];
api.fsp = api.fs.promises;

module.exports = Object.freeze(api);
