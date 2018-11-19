'use strict';

const CONFIG_FILES_PRIORITY = [
  'sandbox.js', 'log.js', 'scale.js', 'servers.js', 'databases.js',
  'sessions.js', 'tasks.js', 'application.js', 'files.js',
  'filestorage.js', 'mail.js', 'hosts.js', 'routes.js'
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

class Config {

  constructor(application) {
    this.application = application;
    this.sandbox = null;
    this.sections = {};
  }

  getSandboxConfig(callback) {
    if (this.application.isImpress) {
      this.sections.sandbox = DEFAULT_API;
      callback();
    } else {
      this.loadConfigFile('sandbox.js', () => {
        if (!this.sections.sandbox) {
          this.sections.sandbox = DEFAULT_API;
        }
        callback();
      });
    }
  }

  loadConfig(callback) {
    const logDir = this.application.dir + '/config';
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
        api.metasync.series(files, this.loadConfigFile, () => {
          this.preprocessConfig();
          // TODO: Move to core
          impress.nodeId = this.application.isImpress ?
            this.sections.scale.server + 'N' + impress.workerId :
            impress.nodeId;
          if (application.isImpress) {
            impress.log.init();
            impress.log.on('open', () => {
              application.start();
              callback();
            });
          } else {
            application.start();
            callback();
          }
        });
      });
    });
    application.cache.watch('/config');
  }

  loadConfigFile(file, callback) {
    const configFile = this.application.dir + '/config/' + file;
    const configDefinition = this.application.isImpress ?
      impress.serverConfigDefinition : impress.applicationConfigDefinition;
    let validationResult;
    const fileExt = api.path.extname(file);
    const fileName = api.path.basename(file, fileExt);
    const sectionName = impress.mode ?
      api.path.basename(fileName, '.' + impress.mode) : fileName;
    if (fileExt !== '.js' || this[sectionName]) {
      callback();
      return;
    }
    impress.createScript(this.application, configFile, (err, exports) => {
      if (err) {
        callback();
        return;
      }
      this[sectionName] = exports;
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

  preprocessConfig() {
    if (Array.isArray(this.section.hosts)) {
      if (this.section.hosts.join('').includes('*')) {
        application.hostsRx = api.common.arrayRegExp(this.section.hosts);
      }
    } else if (!this.application.isImpress) {
      impress.log.error('Configuration error: empty or wrong hosts.js');
    }

    const servers = this.section.servers;
    this.section.servers = {};
    for (const serverName in servers) {
      const server = servers[serverName];
      if (server.ports.length > 1) {
        const cpus = api.os.cpus().length;
        server.ports = api.common.sequence(server.ports, cpus);
      }
      for (let i = 0; i < server.ports.length; i++) {
        const port = server.ports[i];
        const srv = Object.assign({}, server);
        srv.port = port;
        const serviceName = serverName === 'master' ?
          serverName :
          serverName + port;
        if (srv.inspect) srv.inspect += i;
        this.section.servers[serviceName] = srv;
      }
    }

    if (!application.isInitialized && !application.isImpress) {
      application.isInitialized = true;
      if (this.section.routes) { // Prepare application routes
        const routes = this.section.routes;
        for (let j = 0; j < routes.length; j++) {
          const route = routes[j];
          const rx = !route.escaping ? route.url : '^' +
            route.url
              .replace(/(\/|\?|\.)/g, '\\$1')
              .replace(/\(\\\.\*\)/, '(.*)') + '$';
          route.urlRx = new RegExp(rx);
        }
      }
    }
  }

}

impress.Config = Config;
