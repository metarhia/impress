'use strict';

const node = {};
const internals = [
  'util', 'child_process', 'worker_threads', 'os', 'v8', 'vm', 'path', 'url',
  'assert', 'querystring', 'string_decoder', 'perf_hooks', 'async_hooks',
  'timers', 'events', 'stream', 'fs', 'crypto', 'zlib',
  'dns', 'net', 'tls', 'http', 'https', 'http2', 'dgram',
];

for (const name of internals) node[name] = require(name);
node.process = process;
node.childProcess = node['child_process'];
node.StringDecoder = node['string_decoder'];
node.perfHooks = node['perf_hooks'];
node.asyncHooks = node['async_hooks'];
node.worker = node['worker_threads'];
node.fsp = node.fs.promises;
Object.freeze(node);

const npm = {
  common: require('@metarhia/common'),
  ws: require('ws'),
};

const pkgPath = node.path.join(process.cwd(), 'package.json');
const pkg = require(pkgPath);

if (pkg.dependencies) {
  for (const dependency of Object.keys(pkg.dependencies)) {
    if (dependency !== 'impress') npm[dependency] = require(dependency);
  }
}
Object.freeze(npm);

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

module.exports = { node, npm, protect };
