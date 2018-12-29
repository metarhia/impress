'use strict';

// Application interface for Impress Application Server

const PLACES = ['tasks', 'init', 'resources', 'setup', 'schemas', 'lib', 'api'];
if (impress.serverProto === 'http') PLACES.push('www', 'static');

class Application extends api.events.EventEmitter {

  constructor(name, dir) {
    super();
    this.name = name;
    this.dir = dir;
    this.version = '1.0.0';
    this.isInitialized = false;
    this.ready = false;
    this.backend = api.common.emitter();
    this.frontend = api.common.emitter();
    this.config = new impress.Config(this);
    this.scheduler = new impress.Scheduler(this);
    this.schemas = null; // application schemas in metaschema format
    this.databases = {};
    this.sessions = new Map(); // key is token, value is instance of Session
    this.channels = {};
    this.workers = {};
    this.longWorkers = {};
    this.api = {}; // all APIs will be loaded here on start
    this.resources = {};
    this.cache = new impress.Cache(this);
    this.cache.init();

    // TODO: Temporary disable application firewall
    //       to refactor security subsystem and sessions
    // api.firewall.addApplication(this);
    this.state = new impress.State();
    this.security = new impress.Security(this);
    this.cloud = new api.cloud.CloudEmitter(this);
    // JSTP connections
    this.connections = new Map();

    this.systemTemplates = {};
    for (let j = 0; j < impress.TEMPLATES.length; j++) {
      const tplName = impress.TEMPLATES[j];
      const tplFile = api.path.join('/templates', tplName) + '.template';
      const tplPath = api.path.join(this.dir, tplFile);
      this.systemTemplates[tplName] = impress.moduleDir + tplFile;
      api.fs.access(tplPath, err => {
        if (!err) this.systemTemplates[tplName] = tplPath;
      });
    }

    this.nodeId = undefined;
    this.serverId = undefined;
    this.cloudInstance = undefined;
    impress.createSandbox(this, () => {
      const config = impress.config.sections.scale;
      this.config.loadConfig(() => {
        this.nodeId = impress.nodeId;
        this.serverId = config.server;
        this.cloudInstance = config.instance;
        this.emit('start');
        api.db.openApplicationDatabases(this, () => {
          this.loadPlaces(() => {
            this.loadApi(() => {
              this.ready = true;
              this.emit('started');
            });
          });
        });
      });
    });
  }

  loadDatabases(callback) {
    api.db.openApplicationDatabases(this, callback);
  }

  logException(err) {
    let stack = err.stack || err.toString;
    stack = impress.shortenStack(stack);
    if (err.isWarning && impress.log && impress.log.warn) {
      stack = 'Warning' + stack.substring(5);
      impress.log.warn(stack);
    } else {
      impress.log.error(stack);
    }
  }

  // Relative path
  //   path <string> absolute path
  // Returns: application relative path
  relative(path) {
    return path.substr(this.dir.length);
  }

  // Preload Directory
  //   relPath <string> relative path from /www
  //   depth <number> recursion depth, 0 - maximum, 1 - one level (no recursion)
  //   callback <Function> preload finished (err, directories)
  preloadDirectory(relPath, depth, callback) {
    if (depth === undefined) depth = 0;
    const absPath = api.path.join(this.dir, 'www', relPath);
    api.fs.readdir(absPath, (err, files) => {
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
      api.metasync.each(files, (fileName, cb) => {
        const fileExt = api.common.fileExt(fileName);
        const filePath = api.path.join(absPath, fileName);
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            cb();
            return;
          }
          if (stats.isDirectory() && (depth === 0 || depth > 1)) {
            directories.push(fileName);
            this.preloadDirectory(
              api.path.join(relPath, fileName),
              depth - 1, cb
            );
          } else if (fileExt === 'js') {
            impress.createScript(this, filePath, cb);
          } else {
            cb();
          }
        });
      }, () => {
        callback(null, directories);
      });
      this.cache.watch(relPath);
    });
  }

  loadApi(callback) {
    const relPath = '/api/';
    const absPath = api.path.join(this.dir, relPath);
    api.fs.readdir(absPath, (err, files) => {
      if (err) {
        impress.log.error(impress.CANT_READ_DIR + absPath);
        callback();
        return;
      }
      if (files.length === 0) {
        callback(null);
        return;
      }
      api.metasync.each(files, (fileName, cb) => {
        const filePath = absPath + fileName;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            impress.log.error(impress.CANT_READ_FILE + filePath);
            cb();
            return;
          }
          if (!stats.isDirectory()) {
            cb();
            return;
          }
          this.loadApiInterface(fileName, filePath, cb);
        });
      }, callback);
      this.cache.watch(relPath);
    });
  }

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
      api.metasync.each(files, (fileName, cb) => {
        const fileExt = api.common.fileExt(fileName);
        if (fileExt !== 'js') {
          cb();
          return;
        }
        const methodName = api.common.removeExt(fileName);
        const filePath = api.path.join(path, fileName);
        api.fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            cb();
            return;
          }
          impress.createScript(this, filePath, (err, exports) => {
            if (err) {
              cb(err);
              return;
            }
            apiInterface[methodName] = exports;
            cb();
          });
        });
      }, callback);
      this.cache.watch(relPath);
    });
  }

  loadPlaces(callback) {
    api.metasync.each(PLACES, (placeName, cb) => {
      if (placeName === 'static') {
        cb();
        return;
      } else if (placeName === 'schemas') {
        const dir = api.path.join(this.dir, 'schemas');
        const { sandbox } = this;
        api.metaschema.fs.loadAndCreate(dir, sandbox, (error, schemas) => {
          if (error) console.error(error);
          this.schemas = schemas;
          this.emit('schema');
          cb();
        });
      } else {
        this.loadPlaceScripts(placeName, cb);
      }
    }, callback);
  }

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
        } else {
          api.metasync.each(files, (file, cb) => {
            this.processPlaceFile(placeName, path, file, () => {
              this.loadPlaceFile(placeName, path, file, cb);
            }, cb);
          }, callback);
        }
      });
      if (placeName !== 'setup') this.cache.watch('/' + placeName);
    });
  }

  processPlaceFile(placeName, path, file, load, pass) {
    if (!file.endsWith('.js')) {
      pass();
      return;
    }
    if (placeName === 'setup') {
      if (impress.workerId !== 1) {
        pass();
        return;
      }
      this.setupScriptChanged(path, file, (err, changed) => {
        if (changed) load();
        else pass();
      });
    } else {
      load();
    }
  }

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
  //   placeName <string> place name (subdirectory name in application)
  //   path <string> directory path
  //   file <string> file name in place directory
  //   callback <Function> after file loaded
  loadPlaceFile(placeName, path, file, callback) {
    const sectionName = api.path.basename(file, '.js');
    impress.createScript(this, api.path.join(path, file), (err, exports) => {
      if (err) {
        callback();
        return;
      }
      if (placeName === 'tasks') {
        this.scheduler.setTask(sectionName, exports);
      } else if (placeName === 'schemas') {
        this.schemas[sectionName] = exports;
        // Load schemas
      } else if (placeName === 'setup') {
        api.fs.writeFile(
          api.path.join(path, sectionName) + '.done',
          new Date().toISOString(),
          api.common.emptiness
        );
      }
      callback();
    });
  }

  // HTTP Dispatcher
  //   req <IncomingMessage>
  //   res <ServerResponse>
  // Rerurns: <Client>
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
            impress.log.error(err);
            client.error(400);
          } else {
            client.files = files;
            client.fields = fields;
            Object.assign(client.parameters, client.fields);
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
          Object.assign(client.parameters, client.fields);
          client.dispatch();
        });
      }
    });

    return client;
  }

  // Refresh static in memory cache with compression and minification
  //   filePath <string> compressing file path
  //   stats <Stats> instance of fs.Stats
  //   callback <Function>
  //     err <Error>
  //     data <Buffer>
  //     compressed <boolean>
  compress(filePath, stats, callback) {
    api.fs.readFile(filePath, (err, data) => {
      if (err) {
        callback(err);
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
          callback(err, data, true);
          const cache = { stats, compressed: true, data };
          if (!err) this.cache.static.add(relPath, cache);
        });
      } else {
        callback(null, data, false);
        const cache = { stats, compressed: false, data };
        this.cache.static.add(relPath, cache);
      }
      this.cache.watch(api.path.dirname(relPath));
    });
  }

  shutdownLongWorkers() {
    for (const workerId in this.longWorkers) {
      const worker = this.longWorkers[workerId];
      worker.kill();
    }
  }

  // Programmatically create HTTP request handler
  //   method <string> http verb (get, post...)
  //   path <string> path for handler
  //   handler <Function> impress functon (2 arg) or middleware (3 arg)
  handler(method, path, handler) {
    const dirPath = api.path.join('/www', api.common.addTrailingSlash(path));
    const filePath = api.path.join(dirPath, method) + '.js';
    this.cache.scripts.set(filePath, handler);
    this.cache.files.set(filePath, impress.FILE_EXISTS);
    this.cache.folders.set(dirPath, impress.DIR_EXISTS);
  }

  // HTTP GET method
  get(path, handler) {
    this.handler('get', path, handler);
  }

  // HTTP POST method
  post(path, handler) {
    this.handler('post', path, handler);
  }

  // HTTP PUT method
  put(path, handler) {
    this.handler('put', path, handler);
  }

  // HTTP DELETE method
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
      parameters: client.parameters,
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

  // Call application method
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

}

impress.Application = Application;
