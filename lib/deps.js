'use strict';

const CWD = process.cwd();

const fs = require('node:fs');
const path = require('node:path');
const wt = require('node:worker_threads');
const { createRequire, builtinModules } = require('node:module');

const metautil = require('metautil');
const appRequire = createRequire(`file://${CWD}/server.js`);
const IMPRESS_PATH = path.join(__dirname, '..');

const node = {};
const npm = {};
const metarhia = {};

const deprecated = ['sys', 'domain', 'cluster', 'punycode', 'trace_events'];
const unsupported = [...deprecated, 'repl', 'node:sea'];
const isSupported = (s) => !s.startsWith('_') && !unsupported.includes(s);
const internals = [...builtinModules].filter(isSupported);

const optional = ['metasql', 'test'];
const core = ['metaconfiguration', 'metalog', 'metavm', 'metawatch'];
const metapkg = [...core, 'metautil', 'metacom', 'metaschema', ...optional];

const npmpkg = [];
const pkg = require(`${CWD}/package.json`);
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

// Linked impress keeps its own packages in its node_modules
const locate = (name) => {
  const isAppPackage = fs.existsSync(path.join(CWD, 'node_modules', name));
  if (isAppPackage) return { load: appRequire, root: CWD };
  return { load: require, root: IMPRESS_PATH };
};

const loadModule = (name) => {
  const { load, root } = locate(name);
  const lib = load(name);
  const pkgPath = `${root}/node_modules/${name}/package.json`;
  const pkg = require(pkgPath);
  if (!pkg.exports) return lib;
  const subKeys = Object.keys(pkg.exports).map((key) => key.substring(2));
  const subNames = subKeys.filter(validSubmodules);
  for (const subName of subNames) {
    try {
      const sub = load(`${name}/${subName}`);
      const target = lib[subName];
      if (target && target === sub[subName]) continue;
      lib[subName] = sub;
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND' && pkg.peerDependenciesMeta) {
        const moduleName = metautil.between(error.message, `'`, `'`);
        const meta = pkg.peerDependenciesMeta[moduleName];
        if (!meta || meta.optional) continue;
      }
      throw error;
    }
  }
  return lib;
};

for (const name of dependencies) {
  if (name === 'impress') continue;
  const isInternal = internals.includes(name);
  let lib;
  try {
    if (isInternal) {
      const realName = name.startsWith('node:') ? name : `node:${name}`;
      lib = require(realName);
    } else {
      lib = loadModule(name);
    }
  } catch (error) {
    const isRequired = npmpkg.includes(name) || !optional.includes(name);
    if (isRequired) {
      notLoaded.add(`- ${name}: ${error.stack}`);
    }
    continue;
  }
  if (lib.plugins) loadPlugins(lib);
  if (isInternal) {
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

Object.freeze(node);
Object.freeze(npm);
Object.freeze(metarhia);

module.exports = { node, npm, metarhia, notLoaded, wt };
