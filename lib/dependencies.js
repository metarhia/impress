'use strict';

const node = { process };
const npm = {};
const metarhia = { common: require('@metarhia/common') };

const system = ['util', 'child_process', 'worker_threads', 'os', 'v8', 'vm'];
const tools = ['path', 'url', 'string_decoder', 'querystring', 'assert'];
const streams = ['stream', 'fs', 'crypto', 'zlib', 'readline'];
const async = ['perf_hooks', 'async_hooks', 'timers', 'events'];
const network = ['dns', 'net', 'tls', 'http', 'https', 'http2', 'dgram'];
const internals = [...system, ...tools, ...streams, ...async, ...network];

const metapkg = ['metavm', 'metacom', 'metatests', 'metaschema', 'metasql'];
const npmpkg = ['ws'];
const pkg = require(process.cwd() + '/package.json');
const dependencies = [...internals, ...npmpkg, ...metapkg];
if (pkg.dependencies) dependencies.push(...Object.keys(pkg.dependencies));

for (const name of dependencies) {
  if (name === 'impress') continue;
  const lib = require(name);
  if (internals.includes(name)) node[name] = lib;
  else if (metapkg.includes(name)) metarhia[name] = lib;
  else npm[name] = lib;
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

const protect = (config, ...namespaces) => {
  const { dependency } = config;
  for (const namespace of namespaces) {
    const names = Object.keys(namespace);
    for (const name of names) {
      const target = namespace[name];
      const meta = dependency[name];
      if (meta && meta.monkeyPatching === 'allow') continue;
      Object.freeze(target);
    }
  }
};

module.exports = { node, npm, metarhia, protect };
