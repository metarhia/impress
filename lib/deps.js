'use strict';

const fs = require('node:fs');
const path = require('node:path');
const wt = require('node:worker_threads');
const { createRequire, builtinModules } = require('node:module');

const metautil = require('metautil');

const CWD = process.cwd();
const IMPRESS_PATH = path.join(__dirname, '..');
const appRequire = createRequire(`file://${CWD}/server.js`);

const node = {};
const npm = {};
const metarhia = {};

const DEPRECATED = ['sys', 'domain', 'cluster', 'punycode', 'trace_events'];
const UNSUPPORTED = DEPRECATED.concat(['repl', 'node:sea']);
const PREFIXED = ['node:sqlite', 'node:test', 'node:test/reporters'];

const isSupported = (name) => {
  const hidden = name.startsWith('_');
  const blocked = UNSUPPORTED.includes(name);
  return !hidden && !blocked;
};

const listed = new Set(builtinModules);
const missing = PREFIXED.filter((name) => !listed.has(name));
const internals = builtinModules.concat(missing).filter(isSupported);

const OPTIONAL = ['metasql', 'test'];
const CORE = ['metaconfiguration', 'metalog', 'metavm', 'metawatch'];
const METAPKG = CORE.concat(['metautil', 'metacom', 'metaschema'], OPTIONAL);

const pkg = require(`${CWD}/package.json`);
const npmpkg = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
const dependencies = internals.concat(npmpkg, METAPKG);

const notLoaded = new Set();

const assignNamespace = (container, name, value) => {
  container[name] = value;
  const library = name.startsWith('@') ? name.slice(1) : name;
  const key = metautil.replace(library, '/', '-');
  const camelKey = metautil.spinalToCamel(key);
  container[camelKey] = value;
};

const asText = (value) => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return `${value}`;
};

const loadPlugins = (lib) => {
  const plugins = lib.plugins;
  const names = Object.keys(plugins);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    plugins[name] = asText(plugins[name]);
  }
};

const validSubmodules = (key) => {
  const empty = key === '';
  const wildcard = key.includes('*');
  const dotted = key.includes('.');
  return !empty && !wildcard && !dotted;
};

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
  for (let i = 0; i < subNames.length; i++) {
    const subName = subNames[i];
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

const loadDependency = (name) => {
  const isInternal = internals.includes(name);
  try {
    if (isInternal) {
      const prefixed = name.startsWith('node:');
      const realName = prefixed ? name : `node:${name}`;
      const lib = require(realName);
      return { lib, isInternal };
    }
    const lib = loadModule(name);
    return { lib, isInternal };
  } catch (error) {
    const isRequired = npmpkg.includes(name) || !OPTIONAL.includes(name);
    if (isRequired) notLoaded.add(`- ${name}: ${error.stack}`);
    return null;
  }
};

for (let i = 0; i < dependencies.length; i++) {
  const name = dependencies[i];
  if (name === 'impress') continue;
  const loaded = loadDependency(name);
  if (!loaded) continue;
  const { lib, isInternal } = loaded;
  if (lib.plugins) loadPlugins(lib);
  if (isInternal) {
    const key = name.startsWith('node:') ? name.slice(5) : name;
    assignNamespace(node, key, lib);
    continue;
  }
  if (METAPKG.includes(name)) {
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
