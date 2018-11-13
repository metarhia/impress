'use strict';

// Application interface for Impress Application Server

const SCRIPT_PREPARE_TIMEOUT = 500;
const USE_STRICT = '\'use strict\';\n';
const ASCII_BRACE_OPENING = 123;
const ROUTE_NUM_REGEXP = /\[([0-9]+)]/g;

const DEFAULT_SANDBOX = [
  'require', 'Buffer', 'SlowBuffer', 'process',
  'setTimeout', 'setInterval', 'setImmediate',
  'clearTimeout', 'clearInterval', 'clearImmediate'
];

const DEFAULT_API = [
  // Node internal modules
  'os', 'fs', 'sd', 'tls', 'net', 'dns', 'url',
  'util', 'path', 'zlib', 'http', 'https', 'dgram',
  'stream', 'buffer', 'crypto', 'events',
  'readline', 'querystring', 'timers',

  // Impress API modules
  'db', 'con', 'common', 'impress', 'registry', 'definition',

  // Preinstalled modules
  'metasync', 'csv', 'async', 'iconv',
  'zipStream', // npm module zip-stream
  'jstp',      // npm module @metarhia/jstp

  // Optional modules
  'async'
];

const PLACES = ['tasks', 'init', 'setup', 'model', 'lib', 'api'];

const apiWrap = src => USE_STRICT + '(connection => (' + src + '))';

const codeWrap = src => {
  const isObj = src[0] === ASCII_BRACE_OPENING;
  const code = isObj ? '(' + src + ')' : src;
  return USE_STRICT + code;
};

// PrepareScript
//   fileName <string> file name (absolute path)
//   source <string> JavaScript code
// Returns: <Object> exported from script
const prepareScript = (application, fileName, source) => {
  try {
    const key = application.relative(fileName);
    const options = {
      filename: fileName,
      timeout: SCRIPT_PREPARE_TIMEOUT,
    };
    const wrapper = key.startsWith('/api/') ? apiWrap : codeWrap;
    const code = wrapper(source);
    const script = new api.vm.Script(code, options);
    const exports = script.runInContext(application.sandbox, options);
    application.cache.scripts.set(key, exports);
    return exports;
  } catch (err) {
    application.logException(err);
    return null;
  }
};

// Create script
//   fileName <string> absolute path
//   callback <Function>(err, exports)
impress.createScript = (application, fileName, callback) => {
  const key = application.relative(fileName);
  let exports = application.cache.scripts.get(key);
  if (exports) {
    callback(null, exports);
    return;
  }
  api.fs.readFile(fileName, (err, code) => {
    if (err) {
      impress.log.error(impress.CANT_READ_FILE + fileName);
      callback(err);
    } else {
      exports = prepareScript(application, fileName, code);
      callback(null, exports);
    }
  });
};

// Global require for sandbox
//   moduleName <string>
const globalRequire = application => moduleName => {
  let exports;
  if (!moduleName.includes('..')) {
    const path = application.dir + '/node_modules/' + moduleName;
    try {
      exports = require(path);
    } catch (err) {
      application.logException(err);
    }
  } else {
    application.logException(new Error(
      `Access denied. Application can not require module: ${moduleName}`
    ));
  }
  return exports;
};

impress.createSandbox = (application, callback) => {
  const sandbox = {
    api: {},
    console: api.con.createConsole(application.name)
  };
  sandbox.global = sandbox;
  sandbox.application = application;
  application.sandbox = api.vm.createContext(sandbox);
  application.getSandboxConfig(() => {
    const globals = application.config.sandbox.global || DEFAULT_SANDBOX;
    for (let i = 0; i < globals.length; i++) {
      const moduleName = globals[i];
      let moduleLink;
      if (moduleName === 'require') moduleLink = globalRequire(application);
      else moduleLink = global[moduleName];
      if (moduleLink) {
        if (moduleName in api.registry.deprecated) {
          const msg = api.registry.deprecated[moduleName];
          moduleLink = api.registry.deprecate(moduleLink, msg);
        }
        application.sandbox[moduleName] = moduleLink;
      }
    }
    const apis = application.config.sandbox.api || api.registry.defaultNames;
    for (let j = 0; j < apis.length; j++) {
      let moduleName = apis[j];
      let moduleLink = api[moduleName];
      if (!moduleLink) moduleLink = api.registry.require(moduleName);
      if (moduleName === 'fs') {
        moduleLink = api.sandboxedFs.bind(application.dir);
      }
      moduleName = api.common.spinalToCamel(moduleName);
      if (moduleLink) application.sandbox.api[moduleName] = moduleLink;
    }
    callback();
  });
};
