'use strict';

const CONFIG_FILES_PRIORITY = [
  'sandbox.js', 'log.js', 'scale.js', 'servers.js', 'databases.js',
  'sessions.js', 'tasks.js', 'application.js', 'files.js',
  'filestorage.js', 'mail.js', 'hosts.js'
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
  'metasync', 'csvStringify', 'async', 'iconv',
  'zipStream', // npm module zip-stream
  'jstp',      // npm module @metarhia/jstp

  // Optional modules
  'async'
];

class Config {

  constructor(application) {
    this.application = application;
    this.sandbox = null;
    this.sections = {};
  }

  loadSandboxConfig(callback) {
    if (this.application.isImpress) {
      this.sections.sandbox = DEFAULT_API;
      callback(this.sections.sandbox);
    } else {
      this.loadConfigFile('sandbox.js', () => {
        if (!this.sections.sandbox) {
          this.sections.sandbox = DEFAULT_API;
        }
        callback(this.sections.sandbox);
      });
    }
  }

  loadConfig(callback) {
    const logDir = api.path.join(this.application.dir, 'config');
    api.fs.readdir(logDir, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + logDir);
        callback();
        return;
      }
      files.sort((s1, s2) => api.common.sortComparePriority(
        CONFIG_FILES_PRIORITY, s1, s2
      ));
      api.metasync.filter(files, (file, cb) => {
        const fileExt = api.path.extname(file);
        const fileName = api.path.basename(file, fileExt);
        if (!impress.mode) {
          cb(null, !fileName.includes('.'));
          return;
        }
        const modeName = api.path.extname(fileName);
        const fName = fileName + '.' + impress.mode + fileExt;
        const noMode = modeName === '' || modeName === '.' + impress.mode;
        cb(null, !files.includes(fName) && noMode);
      }, (err, files) => {
        api.metasync.series(files, (file, cb) => {
          this.loadConfigFile(file, cb);
        }, callback);
      });
    });
    this.application.cache.watch('/config');
  }

  loadConfigFile(file, callback) {
    const configFile = api.path.join(this.application.dir, 'config', file);
    const configDefinition = this.application.isImpress ?
      impress.serverConfigDefinition : impress.applicationConfigDefinition;
    let validationResult;
    const fileExt = api.path.extname(file);
    const fileName = api.path.basename(file, fileExt);
    const sectionName = impress.mode ?
      api.path.basename(fileName, '.' + impress.mode) : fileName;
    if (fileExt !== '.js' || this.sections[sectionName]) {
      callback();
      return;
    }
    impress.createScript(this.application, configFile, (err, exports) => {
      if (err) {
        callback();
        return;
      }
      this.sections[sectionName] = exports;
      if (configDefinition[sectionName]) {
        validationResult = api.definition.validate(
          exports, configDefinition, sectionName, true
        );
        if (impress.isMaster) {
          api.definition.printErrors(
            'Error(s) in configuration found:\n' +
            `Application: ${this.application.name} \n` +
            `Config file: ${sectionName + '.js'}`,
            validationResult
          );
        }
      }
      callback();
    });
  }

}

impress.Config = Config;
