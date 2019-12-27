'use strict';

const SCRIPT_PREPARE_TIMEOUT = 500;
const USE_STRICT = '\'use strict\';\n';

const DEFAULT_SANDBOX = [
  'Duration', 'Buffer', 'process',
  'setTimeout', 'setInterval', 'setImmediate',
  'clearTimeout', 'clearInterval', 'clearImmediate',
];

// PrepareScript
//   fileName <string> file name (absolute path)
//   source <string> JavaScript code
// Returns: <Object> exported from script
const prepareScript = async (application, fileName, source) => {
  const cfg = application.config.sections.application;
  const scriptTimeout = cfg && cfg.scriptTimeout || SCRIPT_PREPARE_TIMEOUT;
  const options = {
    filename: fileName,
    lineOffset: -2, // to compensate for USE_STRICT addition
  };
  const code = USE_STRICT + source;
  const scriptOptions = { scriptTimeout };
  try {
    const script = new api.vm.Script(code, scriptOptions);
    const exports = script.runInContext(application.sandbox, options);
    return exports;
  } catch (err) {
    application.logException(err);
    return err;
  }
};

// Create script
//   fileName <string> absolute path
//   callback <Function>
//     err <Error>
//     exports <Function>
const createScript = (application, fileName, callback) => {
  const key = application.relative(fileName);
  let exports = application.cache.scripts.get(key);
  if (exports) {
    callback(null, exports);
    return;
  }
  api.fs.readFile(fileName, (err, code) => {
    if (err) {
      callback(err);
    } else {
      exports = prepareScript(application, fileName, code);
      if (Object.prototype.toString.call(exports) === '[object Error]') {
        callback(new Error(`Can not create script ${fileName}`));
      } else {
        callback(null, exports);
      }
    }
  });
};

const createSandbox = (application, callback) => {
  const sandbox = {
    api: {},
    console: api.console.createConsole(application)
  };
  sandbox.global = sandbox;
  sandbox.application = application;
  api.vm.createContext(sandbox);
  application.sandbox = sandbox;
  application.config.loadSandboxConfig((err, sandboxConfig) => {
    const globals = sandboxConfig.global || DEFAULT_SANDBOX;
    for (let i = 0; i < globals.length; i++) {
      const moduleName = globals[i];
      if (moduleName === 'require') continue;
      const moduleLink = moduleName === 'Duration' ?
        api.common.duration : global[moduleName];
      if (moduleLink) {
        application.sandbox[moduleName] = moduleLink;
      }
    }
    const apis = sandboxConfig.api || api.registry.defaultNames;
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

module.exports = { createScript, createSandbox };
