'use strict';

const node = { process };
const npm = {};
const metarhia = {};

const system = ['util', 'child_process', 'worker_threads', 'os', 'v8', 'vm'];
const tools = ['path', 'url', 'string_decoder', 'querystring', 'assert'];
const streams = ['stream', 'fs', 'crypto', 'zlib', 'readline'];
const async = ['perf_hooks', 'async_hooks', 'timers', 'events'];
const network = ['dns', 'net', 'tls', 'http', 'https', 'http2', 'dgram'];
const internals = [...system, ...tools, ...streams, ...async, ...network];

const ORG_LENGTH = '@metarhia/'.length;
const metalibs = ['@metarhia/common', '@metarhia/config'];
const metacore = ['metavm', 'metacom', 'metalog'];
const metaoptional = ['metaschema', 'metasql'];
const metapkg = [...metalibs, ...metacore, ...metaoptional];

const npmpkg = ['ws'];
const pkg = require(process.cwd() + '/package.json');
const dependencies = [...internals, ...npmpkg, ...metapkg];
if (pkg.dependencies) dependencies.push(...Object.keys(pkg.dependencies));

for (const name of dependencies) {
  if (name === 'impress') continue;
  let lib = null;
  try {
    lib = require(name);
  } catch {
    continue;
  }
  if (internals.includes(name)) {
    node[name] = lib;
    continue;
  }
  if (metapkg.includes(name)) {
    const key = name.startsWith('@') ? name.substring(ORG_LENGTH) : name;
    metarhia[key] = lib;
    continue;
  }
  npm[name] = lib;
}

node.childProcess = node['child_process'];
node.StringDecoder = node['string_decoder'];
node.perfHooks = node['perf_hooks'];
node.asyncHooks = node['async_hooks'];
node.worker = node['worker_threads'];
node.fsp = node.fs.promises;

Object.freeze(node);
Object.freeze(npm);
Object.freeze(metarhia);

module.exports = { node, npm, metarhia };
