'use strict';

// Application interface for Impress Application Server

const PLACES = ['tasks', 'init', 'setup', 'model', 'lib', 'api'];
if (impress.serverProto === 'http') PLACES.push('www', 'static');

class Application extends api.events.EventEmitter {

  constructor(name, dir) {
    super();
    this.name = name;
    this.dir = dir;
    this.isInitialized = false;
    this.ready = false;
    this.backend = api.common.emitter();
    this.frontend = api.common.emitter();
    this.config = new impress.Config(this);
    this.scheduler = new impress.Scheduler(this);
    this.model = {}; // key is model name, value is object
    this.users = new Map(); // key is login, value is instance of User
    this.sessions = new Map(); // key is sid, value is instance of Session
    this.channels = {};
    this.workers = {};
    this.longWorkers = {};
    this.api = {}; // all APIs will be loaded here on start
    this.cache = new impress.Cache(this);
    this.cache.init();

    api.firewall.addApplication(this);
    this.state = new impress.State();
    this.security = new impress.Security(this);
    this.cloud = new api.cloud.CloudEmitter(this);
    // JSTP connections
    this.connections = new Map();

    this.systemTemplates = {};
    for (let j = 0; j < impress.TEMPLATES.length; j++) {
      const tplName = impress.TEMPLATES[j];
      const tplFile = '/templates/' + tplName + '.template';
      const tplPath = this.dir + tplFile;
      this.systemTemplates[tplName] = impress.moduleDir + tplFile;
      api.fs.access(tplPath, err => {
        if (!err) this.systemTemplates[tplName] = tplPath;
      });
    }
    impress.createSandbox(this, () => {
      this.config.loadConfig(() => {
        this.config.preprocessConfig();
        this.nodeId = impress.nodeId;
        this.serverId = impress.config.sections.scale.server;
        this.cloudInstance = impress.config.sections.scale.instance;
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
      stack = stack.replace(/^Error: /, 'Warning: ');
      impress.log.warn(stack);
    } else {
      impress.log.error(stack);
    }
  }

  accessLog(client) {
    const endTime = Date.now();
    let geoLocation = '-';
    if (api.geoip) {
      const geo = api.geoip.lookup(client.ip);
      if (geo) geoLocation = geo.country + '/' + geo.region + '/' + geo.city;
    }
    const elapsed = endTime - client.startTime;
    const time = elapsed.toString() + 'ms';
    const login = client.user ? client.user.login : '-';
    const session = client.sid || '-';
    const agent = client.req.headers['user-agent'] || '-';
    const referer = client.req.headers['referer'] || '-';
    const msg = this.name + '\t' + time + '\t' +
      client.ip + '\t' + geoLocation + '\t' +
      login + '\t' + session + '\t' +
      client.socket.bytesRead + '\t' +
      client.socket.bytesWritten + '\t' +
      client.req.method + '\t' +
      client.res.statusCode + '\t' +
      client.req.url + '\t' +
      agent + '\t' + referer;
    impress.log.access(msg);
    if (elapsed >= client.slowTime) impress.log.slow(msg);
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
    callback = api.common.once(callback);
    if (depth === undefined) depth = 0;
    const absPath = this.dir + '/www' + relPath;
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
        const filePath = api.common.addTrailingSlash(absPath) + fileName;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            cb();
            return;
          }
          if (stats.isDirectory() && (depth === 0 || depth > 1)) {
            directories.push(fileName);
            this.preloadDirectory(
              api.common.addTrailingSlash(relPath) + fileName,
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
    const absPath = this.dir + relPath;
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
    const relPath = '/api/' + interfaceName;
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
        const filePath = path + '/' + fileName;
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
      this.loadPlaceScripts(placeName, cb);
    }, callback);
    this.cache.watch('/model');
  }

  loadPlaceScripts(placeName, callback) {
    if (placeName === 'static') {
      callback();
      return;
    }
    const path = this.dir + '/' + placeName;
    api.fs.access(path, err => {
      if (err) {
        callback();
        return;
      }
      api.fs.readdir(path, (err, files) => {
        if (err) {
          impress.log.error(
            impress.CANT_READ_DIR + this.dir + '/config'
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
      this.setupScriptChanged(path, file, changed => {
        if (changed) load();
        else pass();
      });
    } else {
      load();
    }
  }

  setupScriptChanged(path, file, callback) {
    const scriptName = api.path.basename(file, '.js');
    const scriptPath = path + '/' + file;
    const doneFilePath = path + '/' + scriptName + '.done';
    api.fs.readFile(doneFilePath, (err, data) => {
      if (err) {
        // TODO: error-first
        callback(true);
        return;
      }
      const doneDate = new Date(data.toString());
      api.fs.stat(scriptPath, (err, stat) => {
        callback(!err && doneDate < stat.mtime);
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
    impress.createScript(this, path + '/' + file, (err, exports) => {
      if (err) {
        callback();
        return;
      }
      if (placeName === 'tasks') {
        this.scheduler.setTask(sectionName, exports);
      } else if (placeName === 'model') {
        this.model[sectionName] = exports;
      } else if (placeName === 'setup') {
        api.fs.writeFile(
          path + '/' + sectionName + '.done', new Date().toISOString(),
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
    if (this.config.sections.application.slowTime) {
      client.slowTime = this.config.sections.application.slowTime;
    }

    client.static(() => {
      // TODO: optimize
      const httpGet = impress.HTTP_VERBS.indexOf(client.method) === 0;
      if (httpGet) {
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
    callback = api.common.once(callback);
    api.fs.readFile(filePath, (err, data) => {
      if (err) {
        callback(err);
        return;
      }
      const relPath = this.relative(filePath);
      const ext = api.common.fileExt(filePath);
      const lst = this.config.sections.files.preprocess.includes(ext);
      const minified = ext === 'js' && filePath.endsWith('.min.js');
      if (lst && !minified) {
        const pre = impress.preprocess[ext];
        if (pre) {
          data = pre(data);
          if (data) {
            stats.size = data.length;
          } else {
            callback(new Error(ext + ' parse/preprocess error'));
            this.cache.static.add(relPath, impress.FILE_PARSE_ERROR);
            this.cache.watch(api.path.dirname(relPath));
            return;
          }
        }
      }
      const configured = this.config.sections.files.gzip;
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
  //   meta <Object> metadata to be set as handler.handler (optional)
  handler(method, path, handler, meta) {
    const dirPath = '/www' + api.common.addTrailingSlash(path);
    const filePath = dirPath + method + '.js';
    if (meta) handler.meta = meta;
    this.cache.scripts.set(filePath, handler);
    this.cache.files.set(filePath, impress.FILE_EXISTS);
    this.cache.folders.set(dirPath, impress.DIR_EXISTS);
  }

  // HTTP GET method
  get(path, handler, meta) {
    this.handler('get', path, handler, meta);
  }

  // HTTP POST method
  post(path, handler, meta) {
    this.handler('post', path, handler, meta);
  }

  // HTTP PUT method
  put(path, handler, meta) {
    this.handler('put', path, handler, meta);
  }

  // HTTP DELETE method
  delete(path, handler, meta) {
    this.handler('delete', path, handler, meta);
  }

  // Fork long worker
  //   client <Client> client request to be processes in worker
  //   workerFile <string> handler to be executed in forked process
  startWorker(client, workerFile) {
    const user = client.user;
    const clientData = {
      url: client.url,
      query: client.query,
      sid: client.sid,
      session: client.session,
      context: client.context,
      fields: client.fields,
      parameters: client.parameters,
      user: null
    };
    if (user) {
      clientData.user = {
        login: user.login,
        access: user.access,
        data: user.data
      };
    }
    const fileName = client.pathDir + workerFile + '.js';
    impress.forkLongWorker(
      this.name,
      fileName,
      api.json.stringify(clientData)
    );
  }

  // Kill long worker
  //   client <Client> client request
  //   workerFile <string> name of handler file to identify process
  stopWorker(client, workerFile) {
    const fileName = client.pathDir + workerFile + '.js';
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
