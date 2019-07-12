'use strict';

const PLACES = ['tasks', 'init', 'resources', 'setup', 'schemas'];
if (impress.serverProto === 'http') PLACES.push('www', 'static');

// Application interface for Impress Application Server
class Application extends api.events.EventEmitter {

  // Application interface constructor
  //   name <string> application name
  //   dir <string> absolute path to application directory
  //       (e.g. `/ias/applications/example`)
  constructor(name, dir) {
    super();
    this.name = name;
    this.dir = dir;
    this.version = '1.0.0';
    this.started = false;
    this.stopped = false;
    this.log = impress.logger.bind(name);
    this.config = new impress.Config(this);
    this.scheduler = new impress.Scheduler(this);
    this.schemas = new Map(); // Map of application schemas in metaschema format
    this.latestSchema = null;
    this.databases = {};
    this.sessions = new Map(); // key is token, value is instance of Session
    this.channels = {};
    this.workers = new Map();
    this.longWorkers = new Map();
    this.api = {}; // all APIs will be loaded here on start
    this.resources = {};
    this.cache = new impress.Cache(this);
    this.cache.init();
    this.tests = {
      unit: [],
      integration: [],
    };

    // TODO: Temporary disable application firewall
    //       to refactor security subsystem and sessions
    // api.firewall.addApplication(this);
    this.state = new impress.State();
    this.security = new impress.Security(this);
    this.cloud = new api.cloud.CloudEmitter(this);
    this.frontend = this.cloud;
    this.backend = this.cloud;
    // JSTP connections
    this.connections = new Map();
    this.nodeId = undefined;
    this.serverId = undefined;
    this.cloudInstance = undefined;
    let count = 0;
    const started = () => {
      this.started = true;
      this.emit('started');
    };
    const after = () => {
      if (--count === 0) started();
    };
    this.cloud.on(
      'broadcastToClients',
      ({ interfaceName, eventName, args }) => {
        const { instance } = impress.server;
        if (instance && typeof instance.broadcast === 'function') {
          instance.broadcast(interfaceName, eventName, ...args);
        }
      }
    );
    impress.createSandbox(this, () => {
      const config = impress.config.sections.scale;
      this.config.loadConfig(() => {
        this.nodeId = impress.nodeId;
        this.serverId = config.server;
        this.cloudInstance = config.instance;

        const steps = [
          callback => api.db.openApplicationDatabases(this, callback),
          callback => this.loadPlaces(callback),
          callback => this.loadLib(api.path.join(this.dir, 'lib'), callback),
          callback => this.loadApi(callback),
        ];

        if (impress.mode === 'test') {
          steps.push(callback => this.loadIntegrationTests(
            api.path.join(this.dir, 'test'),
            callback
          ));
        }

        api.metasync.sequential(steps, () => {
          count = this.listeners('ready').length;
          if (count === 0) started();
          else this.emit('ready', after);
        });
      });
    });
  }

  // Load application databases according to application config
  //   callback <Function> on databases loaded
  loadDatabases(callback) {
    api.db.openApplicationDatabases(this, callback);
  }

  // Log Error instance
  //   err <Error>
  logException(err) {
    const stack = impress.shortenStack(err.stack);
    this.log.error(stack);
  }

  // Get path relative path to the application
  //   path <string> absolute path
  // Returns: <string> application relative path
  relative(path) {
    return path.substr(this.dir.length);
  }

  // Preload directory from `www/`
  //   relPath <string> relative path from `www/`
  //   depth <number> recursion depth, 0 - maximum, 1 - one level (no recursion)
  //   callback <Function> on preload finished
  //     err <Error> | <null>
  //     directories <string[]>
  preloadDirectory(relPath, depth, callback) {
    if (depth === undefined) depth = 0;
    const absPath = api.path.join(this.dir, 'www', relPath);
    api.fs.readdir(absPath, { withFileTypes: true }, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + absPath);
        callback(err);
        return;
      }
      const directories = [];
      if (files.length === 0) {
        callback(null, directories);
        return;
      }
      api.metasync.each(files, (file, next) => {
        const fileName = file.name;
        const fileExt = api.common.fileExt(fileName);
        const filePath = api.path.join(absPath, fileName);
        if (file.isDirectory() && (depth === 0 || depth > 1)) {
          directories.push(fileName);
          const path = api.path.join(relPath, fileName);
          this.preloadDirectory(path, depth - 1, next);
        } else if (fileExt === 'js') {
          impress.createScript(this, filePath, (err, func) => {
            if (err) this.log.error(impress.CANT_READ_FILE + filePath);
            next(err, func);
          });
        } else {
          next();
        }
      }, () => {
        callback(null, directories);
      });
      this.cache.watch(relPath);
    });
  }

  // Load application library and unit tests from `path`
  //   path <string> absolute path to directory
  //   callback <Function> on library loaded
  //     err <Error> | <null>
  loadLib(path, callback) {
    api.fs.readdir(path, { withFileTypes: true }, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + path);
        callback(err);
        return;
      }
      api.metasync.each(files, (file, cb) => {
        const fileName = file.name;
        const filePath = api.path.join(path, fileName);
        if (file.isDirectory()) {
          this.loadLib(filePath, cb);
          return;
        }
        if (filePath.endsWith('.js')) {
          this.loadLibFile(filePath, cb);
          return;
        }
        cb(null);
      }, (err) => {
        this.cache.watch(api.path.relative(this.dir, path));
        callback(err);
      });
    });
  }

  // Load application library file or unit test from `path`
  //   path <string> absolute path to file
  //   callback <Function> on library loaded
  //     err <Error> | <null>
  loadLibFile(path, callback) {
    const isTest = path.endsWith('.test.js');
    if (isTest && impress.mode !== 'test') {
      callback(null);
      return;
    }

    impress.createScript(this, path, (err, test) => {
      if (err) {
        this.log.error(impress.CANT_READ_FILE + path);
        callback(err);
        return;
      }
      if (isTest) this.tests.unit.push({ path, test });
      callback(null);
    });
  }

  // Load application integration tests from `path`
  //   path <string> absolute path to directory
  //   callback <Function> on library loaded
  //     err <Error> | <null>
  loadIntegrationTests(path, callback) {
    api.fs.readdir(path, { withFileTypes: true }, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + path);
        callback(err);
        return;
      }
      api.metasync.each(files, (file, cb) => {
        const fileName = file.name;
        const filePath = api.path.join(path, fileName);
        if (file.isDirectory()) {
          this.loadIntegrationTests(filePath, cb);
          return;
        }
        if (filePath.endsWith('.js')) {
          this.loadIntegrationTestFile(filePath, cb);
          return;
        }
        cb(null);
      }, callback);
    });
  }

  // Load application integration test from `path`
  //   path <string> absolute path to file
  //   callback <Function> on library loaded
  //     err <Error> | <null>
  loadIntegrationTestFile(path, callback) {
    impress.createScript(this, path, (err, test) => {
      if (err) {
        this.log.error(impress.CANT_READ_FILE + path);
        callback(err);
        return;
      }
      if (path.endsWith('.test.js')) {
        this.tests.integration.push({ path, test });
      }
      callback(null);
    });
  }

  // Load application JSTP-api from `api/` directory
  //   callback <Function> on api loaded
  //     err <Error> | <null>
  //     interfaces <string[]> array of paths to api interfaces folders (e.g
  //         ['/ias/api/interface1', '/ias/api/interface2'])
  loadApi(callback) {
    const relPath = '/api/';
    const absPath = api.path.join(this.dir, relPath);
    api.fs.readdir(absPath, { withFileTypes: true }, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + absPath);
        callback();
        return;
      }
      if (files.length === 0) {
        callback();
        return;
      }
      api.metasync.each(files, (file, next) => {
        const fileName = file.name;
        const filePath = absPath + fileName;
        if (!file.isDirectory()) {
          next();
          return;
        }
        this.loadApiInterface(fileName, filePath, next);
      }, callback);
      this.cache.watch(relPath);
    });
  }

  // Load single interface for JSTP-api
  //   interfaceName <string> interface folder in `api/`
  //   path <string> path to interface directory
  //       (e.g. `/ias/applications/example/api/interfaceName`)
  //   callback <Function> on api interface loaded
  //     err <Error> | <null>
  loadApiInterface(interfaceName, path, callback) {
    const relPath = api.path.join('/api', interfaceName);
    const apiInterface = {};
    this.api[interfaceName] = apiInterface;
    api.fs.readdir(path, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + relPath);
        callback(err);
        return;
      }
      if (files.length === 0) {
        callback(null);
        return;
      }
      api.metasync.each(files, (fileName, next) => {
        const fileExt = api.common.fileExt(fileName);
        if (fileExt !== 'js') {
          next();
          return;
        }
        const methodName = api.common.removeExt(fileName);
        const filePath = api.path.join(path, fileName);
        api.fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            next();
            return;
          }
          impress.createScript(this, filePath, (err, exports) => {
            if (err) {
              this.log.error(impress.CANT_READ_FILE + filePath);
              next();
              return;
            }
            apiInterface[methodName] = exports;
            next();
          });
        });
      }, callback);
      this.cache.watch(relPath);
    });
  }

  // Load application schemas.
  //   callback <Function> on schemas loaded
  //     err <Error> | <null>
  loadSchemas(callback) {
    const dir = api.path.join(this.dir, 'schemas');
    const loaderPath = api.path.join(dir, 'config.js');

    impress.createScript(this, loaderPath, (err, getMsConfig) => {
      if (err) {
        if (err.code === 'ENOENT') {
          callback(null);
        } else {
          this.log.error(impress.CANT_READ_FILE + loaderPath);
          callback(err);
        }
        return;
      }

      const {
        additionalSchemas: additionalPaths, options, config
      } = getMsConfig();

      const paths = Array.isArray(additionalPaths) ?
        [dir, ...additionalPaths] :
        dir;

      options.context = this.sandbox;

      const loadSchema = api.util.callbackify(api.metaschema.fs.load);
      loadSchema(paths, options, config, (err, schema) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, schema);
      });
    });
  }

  // Update application schemas
  //   versionInfo <Object>
  //     version <any>
  //   callback <Function>
  //     err <Error> | <null>
  updateSchemas({ version = 1 }, callback) {
    this.loadSchemas((error, schema) => {
      if (error) {
        callback(error);
        return;
      }
      schema.version = version;
      this.latestSchema = schema;
      this.schemas.set(version, schema);
      this.emit('schemaUpdated', version, schema);
      callback(null);
    });
  }

  // Load application places.
  // Possible places are 'tasks', 'init', 'resources', 'setup', 'schemas',
  // and if serverProto is 'http' place 'www' also included
  //   callback <Function> on places loaded
  //     err <null>
  //     places <string[]>
  loadPlaces(callback) {
    api.metasync.series(PLACES, (placeName, next) => {
      if (placeName === 'static') {
        next();
        return;
      }
      if (placeName === 'schemas') {
        const filePath = api.path.join(this.dir, 'schemas', 'version.js');
        impress.createScript(this, filePath, (err, version) => {
          if (err) {
            this.logException(err);
            next(err);
            return;
          }
          this.updateSchemas(version, error => {
            if (error) this.logException(error);
            this.cache.watch('/schemas');
            next(error);
          });
        });
        return;
      }
      this.loadPlaceScripts(placeName, next);
    }, callback);
  }

  // Load scripts from single place
  //   placeName <string> place folder in application (e.g. 'init')
  //   callback <Function> on place scripts loaded
  //     err <null>
  //     files <string[]> all files in place folder
  loadPlaceScripts(placeName, callback) {
    const path = api.path.join(this.dir, placeName);
    api.fs.access(path, err => {
      if (err) {
        callback();
        return;
      }
      api.fs.readdir(path, (err, files) => {
        if (err) {
          impress.log.error(
            impress.CANT_READ_DIR + api.path.join(this.dir, 'config')
          );
          callback();
          return;
        }
        api.metasync.each(files, (file, next) => {
          this.processPlaceFile(placeName, path, file, (err, load) => {
            if (load) this.loadPlaceFile(placeName, path, file, next);
            else next();
          });
        }, callback);
      });
      if (placeName !== 'setup') this.cache.watch('/' + placeName);
    });
  }

  // Process place file.
  // If placeName is 'setup', then it will check for every script whether it was
  // changed since the last execution.
  // If it was, then it should not be loaded
  //   placeName <string> place folder in application
  //   path <string> path to place folder
  //   file <string> file name in place directory
  //   callback <Function>
  //     err <null>
  //     load <boolean> true to load, false to skip
  processPlaceFile(placeName, path, file, callback) {
    if (!file.endsWith('.js')) {
      callback(null, false);
      return;
    }
    if (placeName === 'setup') {
      if (impress.workerId !== 1) {
        callback(null, false);
        return;
      }
      this.setupScriptChanged(path, file, callback);
      return;
    }
    callback(null, true);
  }

  // Determine if the file has changed.
  // Read scriptName.done file and compare the time of last execution and the
  // time of the last file change
  //   path <string> path to place folder
  //   file <string> file name in place directory
  //   callback <Function>
  //     err <Error>
  //     changed <boolean> whether file was changed
  setupScriptChanged(path, file, callback) {
    const scriptName = api.path.basename(file, '.js');
    const scriptPath = api.path.join(path, file);
    const doneFilePath = api.path.join(path, scriptName) + '.done';
    api.fs.readFile(doneFilePath, (err, data) => {
      if (err) {
        callback(null, true);
        return;
      }
      const doneDate = new Date(data.toString());
      api.fs.stat(scriptPath, (err, stat) => {
        callback(null, !err && doneDate < stat.mtime);
      });
    });
  }

  // Load file from place
  //   placeName <string> place folder in application
  //   path <string> path to place folder
  //   file <string> file name in place directory
  //   callback <Function> file loaded
  loadPlaceFile(placeName, path, file, callback) {
    const sectionName = api.path.basename(file, '.js');
    const fileName = api.path.join(path, file);
    impress.createScript(this, fileName, (err, exports) => {
      if (err) {
        this.log.error(impress.CANT_READ_FILE + fileName);
        callback();
        return;
      }
      if (placeName === 'tasks') {
        this.scheduler.setTask(sectionName, exports);
      } else if (placeName === 'setup') {
        Promise.resolve(exports).then(() => {
          api.fs.writeFile(
            api.path.join(path, sectionName) + '.done',
            new Date().toISOString(),
            api.common.emptiness
          );
        }, err => {
          this.log.error(
            `Setup script ${
              fileName
            } failed, not creating ${
              fileName
            }.done file: ${err}`
          );
        });
      }
      callback();
    });
  }

  // HTTP Dispatcher.
  // Create new Client instance from request and response.
  //   req <http.IncomingMessage> http request
  //   res <http.ServerResponse> http response
  // Returns: <Client>
  dispatch(req, res) {
    const client = new impress.Client(this, req, res);
    const config = this.config.sections.application;
    if (config.slowTime) client.slowTime = config.slowTime;

    client.static(() => {
      if (client.method === 'get') {
        client.dispatch();
        return;
      }
      const contentType = req.headers['content-type'];
      if (contentType && contentType.startsWith('multipart')) {
        const form = new api.multiparty.Form();
        form.parse(req, (err, fields, files) => {
          if (err) {
            client.error(400);
          } else {
            client.files = files;
            client.fields = fields;
            client.dispatch();
          }
        });
      } else {
        req.on('data', chunk => {
          client.chunks.push(chunk);
        });
        req.on('end', () => {
          client.data = Buffer.concat(client.chunks).toString();
          if (contentType && contentType.startsWith('application/json')) {
            client.fields = api.json.parse(client.data);
          } else {
            client.fields = api.querystring.parse(client.data);
          }
          client.dispatch();
        });
      }
    });

    return client;
  }

  // Refresh static in memory cache with compression and minification
  //   filePath <string> compressing file path
  //   stats <fs.Stats> instance of fs.Stats
  //   callback <Function> (optional)
  //     err <Error>
  //     data <Buffer>
  //     compressed <boolean>
  compress(filePath, stats, callback) {
    api.fs.readFile(filePath, (err, data) => {
      if (err) {
        this.log.error(impress.CANT_READ_FILE + filePath);
        if (callback) callback(err, null, false);
        return;
      }
      const relPath = this.relative(filePath);
      const ext = api.common.fileExt(filePath);
      const config = this.config.sections.files;
      const configured = config.gzip;
      const compressed = impress.COMPRESSED_EXT.includes(ext);
      const large = stats.size > impress.COMPRESS_ABOVE;
      if (configured && !compressed && large) {
        api.zlib.gzip(data, (err, data) => {
          if (!err) stats.size = data.length;
          if (callback) callback(err, data, true);
          const cache = { stats, compressed: true, data };
          if (!err) this.cache.static.add(relPath, cache);
        });
      } else {
        if (callback) callback(null, data, false);
        const cache = { stats, compressed: false, data };
        this.cache.static.add(relPath, cache);
      }
      this.cache.watch(api.path.dirname(relPath));
    });
  }

  // Shutdown application long workers
  shutdownLongWorkers() {
    for (const worker of this.longWorkers.values()) {
      worker.process.kill();
    }
  }

  // Programmatically create HTTP request handler
  //   method <string> http verb (get, post, put, delete etc.)
  //   path <string> path for handler
  //   handler <Function> impress function (2 arg) or middleware (3 arg)
  handler(method, path, handler) {
    const dirPath = api.path.join('/www', api.common.addTrailingSlash(path));
    const filePath = api.path.join(dirPath, method) + '.js';
    this.cache.scripts.set(filePath, handler);
    this.cache.files.set(filePath, impress.FILE_EXISTS);
    this.cache.folders.set(dirPath, impress.DIR_EXISTS);
  }

  // Create handler for HTTP GET method
  //   path <string> path for handler
  //   handler <Function> impress function (2 arg) or middleware (3 arg)
  get(path, handler) {
    this.handler('get', path, handler);
  }

  // Create handler for HTTP POST method
  //   path <string> path for handler
  //   handler <Function> impress function (2 arg) or middleware (3 arg)
  post(path, handler) {
    this.handler('post', path, handler);
  }

  // Create handler for HTTP PUT method
  //   path <string> path for handler
  //   handler <Function> impress function (2 arg) or middleware (3 arg)
  put(path, handler) {
    this.handler('put', path, handler);
  }

  // Create handler for HTTP DELETE method
  //   path <string> path for handler
  //   handler <Function> impress function (2 arg) or middleware (3 arg)
  delete(path, handler) {
    this.handler('delete', path, handler);
  }

  // Fork long worker
  //   client <Client> client request to be processes in worker
  //   workerFile <string> handler to be executed in forked process
  startWorker(client, workerFile) {
    const clientData = api.json.stringify({
      url: client.url,
      query: client.query,
      context: client.context,
      fields: client.fields,
      session: client.session ? {
        token: client.session.token,
        login: client.session.login,
        data: client.session.data,
        access: client.session.access,
      } : null
    });
    const fileName = client.pathDir + workerFile + '.js';
    impress.forkLongWorker(this.name, fileName, clientData);
  }

  // Kill long worker
  //   client <Client> client request
  //   workerFile <string> name of handler file to identify process
  stopWorker(client, workerFile) {
    const fileName = api.path.join(client.pathDir, workerFile) + '.js';
    impress.killLongWorker(this.name, fileName);
  }

  // Call application method with JSTP
  //   connection <Object> connection instance
  //   interfaceName <string> name of the interface
  //   methodName <string> name of the method
  //   args <Array> method arguments (including callback)
  //   callback <Function>
  callMethod(connection, interfaceName, methodName, args, callback) {
    impress.jstp.callMethod(
      this, connection, interfaceName, methodName, args, callback
    );
  }

  // Get an array of methods of an interface
  //   interfaceName <string> name of the interface to inspect
  getMethods(interfaceName) {
    const appInterface = this.api[interfaceName];
    if (!appInterface) return null;
    return Object.keys(appInterface);
  }

  broadcastToClients(interfaceName, eventName, ...args) {
    this.cloud.emit(
      'broadcastToClients',
      { interfaceName, eventName, args }
    );
  }
}

impress.Application = Application;

module.exports = { Application };
