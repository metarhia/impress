'use strict';

const CWD = process.cwd();

const wt = require('node:worker_threads');
const { createRequire, builtinModules } = require('node:module');
const metautil = require('metautil');
const appRequire = createRequire(`file://${CWD}/server.js`);

const node = {};
const npm = {};
const metarhia = {};

const deprecated = ['sys', 'domain', 'cluster', 'punycode', 'trace_events'];
const notDeprecated = (s) => !s.startsWith('_') && !deprecated.includes(s);
const internals = [...builtinModules].filter(notDeprecated);

const optional = ['metasql', 'test'];
const core = ['metaconfiguration', 'metalog', 'metavm', 'metawatch'];
const metapkg = [...core, 'metautil', 'metacom', 'metaschema', ...optional];

const npmpkg = ['ws'];
const pkg = require(CWD + '/package.json');
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

const validSubmodules = (key) =>
  key !== '' && !key.includes('*') && !key.includes('.');

const loadModule = (name) => {
  const lib = appRequire(name);
  const pkg = require(`${CWD}/node_modules/${name}/package.json`);
  if (!pkg.exports) return lib;
  const subKeys = Object.keys(pkg.exports).map((key) => key.substring(2));
  const subNames = subKeys.filter(validSubmodules);
  for (const subName of subNames) {
    const sub = appRequire(name + '/' + subName);
    lib[subName] = sub;
  }
  return lib;
};

for (const name of dependencies) {
  if (name === 'impress') continue;
  let lib = null;
  try {
    if (internals.includes(name)) {
      const realName = name.startsWith('node:') ? name : `node:${name}`;
      lib = require(realName);
    } else {
      lib = loadModule(name);
    }
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
if (!node.timers.promises) {
  node.timers.promises = require('node:timers/promises');
}

Object.freeze(node);
Object.freeze(npm);
Object.freeze(metarhia);

module.exports = { node, npm, metarhia, notLoaded, wt };
