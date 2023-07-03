'use strict';

const wt = require('node:worker_threads');
const metautil = require('metautil');

const node = {};
const npm = {};
const metarhia = {};

const sys = ['util', 'buffer', 'child_process', 'os', 'v8', 'vm'];
const tools = ['path', 'string_decoder', 'querystring'];
const test = ['assert', 'test'];
const streams = ['stream', 'fs', 'crypto', 'zlib', 'readline'];
const async = ['perf_hooks', 'async_hooks', 'timers', 'events'];
const net = ['dns', 'net', 'tls', 'http', 'https', 'http2', 'dgram'];
const internals = [...sys, ...tools, ...streams, ...async, ...net, ...test];

const optional = ['metasql', 'test'];
const core = ['metaconfiguration', 'metalog', 'metavm', 'metawatch'];
const metapkg = [...core, 'metautil', 'metacom', 'metaschema', ...optional];

const npmpkg = ['ws'];
const pkg = require(process.cwd() + '/package.json');
if (pkg.dependencies) npmpkg.push(...Object.keys(pkg.dependencies));
const dependencies = [...internals, ...npmpkg, ...metapkg];

const notLoaded = new Set();

const assignNamespace = (container, name, value) => {
  container[name] = value;
  const library = name.startsWith('@') ? name.slice(1) : name;
  const key = metautil.replace(library, '/', '-');
  const camelKey = metautil.spinalToCamel(key);
  container[camelKey] = value;
};

const loadPlugins = (lib) => {
  for (const plugin of Object.keys(lib.plugins)) {
    lib.plugins[plugin] = String(lib.plugins[plugin]);
  }
};

for (const name of dependencies) {
  if (name === 'impress') continue;
  let lib = null;
  try {
    lib = internals.includes(name) ? require(`node:${name}`) : require(name);
  } catch {
    if (npmpkg.includes(name) || !optional.includes(name)) {
      notLoaded.add(name);
    }
    continue;
  }
  if (lib.plugins) loadPlugins(lib);
  if (internals.includes(name)) {
    assignNamespace(node, name, lib);
    continue;
  }
  if (metapkg.includes(name)) {
    assignNamespace(metarhia, name, lib);
    continue;
  }
  assignNamespace(npm, name, lib);
}

node.childProcess = node['child_process'];
node.StringDecoder = node['string_decoder'];
node.perfHooks = node['perf_hooks'];
node.asyncHooks = node['async_hooks'];
node.fsp = node.fs.promises;
node.timers.promises = require('node:timers/promises');

Object.freeze(node);
Object.freeze(npm);
Object.freeze(metarhia);

module.exports = { node, npm, metarhia, notLoaded, wt };
