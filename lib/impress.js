'use strict';

global.impress = {};
global.api = {};

api.console = console;
api.require = require;
api.os = require('os');
api.vm = require('vm');

impress.initContext = require('./global');
impress.initContext(global);

impress.callInContextScript = api.vm.createScript('callInContext(global);', 'impress.vm');
impress.callInContextMethod = function(context) {
  if (context && context.__callInContext) context.__callInContext(context);
};

impress.isMainApplication = true;
impress.isWin = !!process.platform.match(/^win/);

// Node.js internal modules
//
api.domain = require('domain');
api.crypto = require('crypto');
api.tls = require('tls');
api.net = require('net');
api.http = require('http');
api.https = require('https');
api.dns = require('dns');
api.dgram = require('dgram');
api.url = require('url');
api.path = require('path');
api.punycode = require('punycode');
api.fs = require('fs');
api.util = require('util');
api.events = require('events');
api.cluster = require('cluster');
api.querystring = require('querystring');
api.readline = require('readline');
api.stream = require('stream');
api.zlib = require('zlib');
api.cp = require('child_process');
api.exec = api.cp.exec;
api.sd = require('string_decoder').StringDecoder;

// External modules
//
api.async = require('async');
api.mkdirp = require('mkdirp');
api.colors = require('colors');
api.multiparty = require('multiparty');
api.iconv = require('iconv-lite');
api.stringify = require('json-stringify-safe');
api.csv = require('csv');

// Impress core modules
//
require('./impress.constants');
require('./impress.utilities');
require('./api.definition');
require('./impress.application');
require('./impress.client');

// Paths to directories
//
impress.dir = process.cwd().replace(/\\/g, '/');
impress.applicationsDir = impress.dir + '/applications';
impress.templatesDir = api.path.dirname(__dirname).replace(/\\/g, '/') + '/templates/';

// Load configuration definition
//
impress.serverConfigDefinition = api.definition.require('config.impress.definition');
impress.applicationConfigDefinition = api.definition.require('config.application.definition');

// Intercept uncaught exception
//
process.on('uncaughtException', function(err) {
  if (impress.logException) impress.logException(err);
  else {
    console.log('Can\'t log uncaught Exception');
    console.log(err.stack);
  }
  impress.shutdown();
});

// Impress safe require
//
impress.require = function(moduleName) {
  if (impress.API_ALIASES[moduleName]) moduleName = impress.API_ALIASES[moduleName];
  var lib = null;
  try { lib = require(moduleName); } catch(err) {}
  if (api.cluster.isMaster && lib === null) {
    console.log(
      'Warning: module ' + moduleName + ' is not installed\n'.yellow.bold +
      '  You need to install it using ' + ('npm install ' + moduleName).bold + ' or disable in config\n'
    );
    if (impress.log && impress.log.error) {
      impress.log.error('Warning: module ' + moduleName + ' is not installed');
    }
  }
  return lib;
};

impress.stat = {
  forkCount: 0,
  eventCount: 0,
  requestCount:  0,
  responseCount: 0
};

impress.applications = {};
impress.server = new api.events.EventEmitter();
impress.preprocess = {};
impress.configDir = impress.dir + '/config';
impress.nextWorkerId = 1;

// Load plugins
//
impress.loadPlugins = function() {
  var plugins = impress.getByPath(impress, 'config.sandbox.plugins');
  if (plugins) {
    if (api.cluster.isMaster && plugins.indexOf('impress.log') === -1) {
      console.log('Warning: plugin impress.log.js is not loaded'.yellow.bold);
    }
    // Load plugins
    var i, pluginName, cache;
    for (i = 0; i < plugins.length; i++) {
      pluginName = './' + plugins[i] + '.js';
      cache = require.cache[require.resolve(pluginName)];
      if (!cache) require(pluginName);
    }
  }
};

impress.compareMasks = function(m1, m2) {
  return (m1 === m2 || m1 === '*' || m2 === '*');
};

impress.compareHosts = function() {
  var i, j, config, hosts, appName,
      cmp = [];
  for (appName in impress.applications) {
    config = impress.applications[appName].config;
    if (config) {
      hosts = config.hosts;
      if (hosts) {
        for (i = 0; i < hosts.length; i++) {
          for (j = 0; j < cmp.length; j++) {
            if (impress.compareMasks(hosts[i], cmp[j])) console.log(
              ('  Hosts mask overlapping: "' + hosts[i] + '" and "' + cmp[j] + '"').red.bold
            );
          }
        }
        for (i = 0; i < hosts.length; i++) {
          if (cmp.indexOf(hosts[i]) === -1 ) cmp.push(hosts[i]);
        }
      }
    }
  }
};

// Fatal error with process termination
//
impress.fatalError = function(msg) {
  if (impress.log && impress.log.error) {
    impress.log.server('Crashed');
    impress.log.error(msg);
    impress.log.close(function() { process.exit(1); });
  } else {
    console.log(msg.red.bold);
    process.exit(1);
  }
};

// Load applications
//
impress.loadApplications = function(callback) {
  api.fs.readdir(impress.applicationsDir, function(err, apps) {
    if (err) {
      impress.fatalError(impress.CANT_READ_DIR + impress.applicationsDir);
      if (callback) callback();
    } else {
      var cbCount = apps.length,
          cbIndex = 0,
          cb = function() {
            impress.compareHosts();
            if (++cbIndex >= cbCount && callback) callback();
          },
          i, appName, dir, stats, existsLink, linkFile, appLink;
      for (i = 0; i < apps.length; i++) {
        appName = apps[i];
        dir = impress.applicationsDir + '/' + appName;
        stats = api.fs.statSync(dir);
        linkFile = dir + '/application.link';
        existsLink = api.fs.existsSync(linkFile);
        if (existsLink) {
          appLink = api.fs.readFileSync(linkFile, 'utf8');
          dir = impress.removeBOM(appLink);
        }
        (function() {
          if (stats.isDirectory() && (!impress.workerApplicationName || impress.workerApplicationName === appName)) {
            var application = new api.events.EventEmitter();
            application.Client = impress.createApplicationClientClass(application, {});
            extend(application, { name:appName, dir:dir });
            impress.mixinApplication(application, function() {
              application.loadConfig(function() {
                impress.applications[application.name] = application;
                application.preprocessConfig();
                impress.log.mixinApplication(application);
                application.log.open(function() {
                  application.loadPlaces(function() {
                    if (application.config.application) {
                      if (application.config.application.preload) application.preloadDirectory('/');
                      cb();
                    } else cb();
                  });
                });
              });
            });
          } else cb();
        } ());
      }
    }
  });
};

var isFirstStart = true;

// Start servers
//
impress.server.start = function() {
  impress.mixinApplication(impress, function() {
    impress.mode = process.env['IMPRESS_MODE'] || '';
    impress.workerId = api.cluster.isMaster ? 0 : process.env['WORKER_ID'];
    impress.workerType = process.env['WORKER_TYPE'];
    impress.serverName = process.env['WORKER_SERVER_NAME'];
    if (api.cluster.isMaster) console.log('Impress Application Server'.green.bold + ' starting, reading configuration'.green);
    impress.loadConfig(function() {
      impress.preprocessConfig();
      impress.loadPlugins();
      impress.log.mixinApplication(impress);
      impress.log.open(function() {
        if (impress.workerType === 'long') {
          impress.nodeId = impress.config.scale.cluster + 'L' + impress.workerId;
          process.title = 'impress ' + impress.nodeId;
          impress.workerApplicationName = process.env['WORKER_APPNAME'];
          impress.workerApplicationFile = process.env['WORKER_FILE'];
          impress.workerApplicationClient = JSON.parse(process.env['WORKER_CLIENT']);
        } else {
          impress.nodeId = impress.config.scale.cluster + 'N' + impress.workerId;
          process.title = 'impress' + (api.cluster.isMaster ? ' srv' : ' ' + impress.nodeId);
        }
        impress.processMarker = (api.cluster.isMaster ? 'Master':'Worker') + '(' + process.pid + '/' + impress.nodeId + ')';
        if (api.cluster.isMaster && impress.config.scale && impress.config.scale.check) {
          console.log('Startup check: '.green + impress.config.scale.check);
          api.http.get(impress.config.scale.check, function(res) {
            if (res.statusCode === 404) startup();
            else impress.fatalError(impress.ALREADY_STARTED);
          }).on('error', startup);
        } else startup();
      });
    });

    function startup() {
      impress.startIpc();
      impress.loadApplications(function() {
        impress.server.emit('start');
        if (api.cluster.isMaster) {
          impress.log.server('Started');
          impress.server.emit('master');
        } else {
          impress.log.server('Forked');
          impress.server.emit('worker');
        }
        if (impress.workerApplicationName) {
          var application = impress.applications[impress.workerApplicationName];
          application.runScript(impress.workerApplicationFile, impress.workerApplicationClient, function() {
            impress.log.server('Terminated');
            impress.log.close(function() { process.exit(0); });
          });
        }
      });
      if (!impress.workerApplicationName) {
        impress.startServers();
        if (impress.health) impress.health.init();
        if (impress.scale) impress.scale.init();
      }
      // Set garbage collection interval
      if (typeof(global.gc) === 'function' && impress.config.scale.gcInterval > 0) {
        setInterval(function() {
          global.gc();
        }, impress.config.scale.gcInterval);
      }
      isFirstStart = false;
    }
  });
};

// Unload configuration and stop server
//
impress.server.stop = function(callback) {
  var servers = impress.config.servers;
  if (!servers) {
    if (callback) callback();
  } else {
    var cbCount = Object.keys(servers).length,
        cbIndex = 0,
        server, serverName, application, appName;
    if (cbCount === 0) {
      if (callback) callback();
    } else {
      for (serverName in servers) {
        server = servers[serverName];
        if (server.listener) server.listener.close(function() {
          if (++cbIndex >= cbCount && callback) {
            impress.clearCache();
            for (appName in impress.applications) {
              application = impress.applications[appName];
              application.stopTasks();
              application.clearCache();
            }
            callback();
          }
        }); else if (++cbIndex >= cbCount && callback) callback();
      }
    }
  }
};

// Reload configuration and restart server
//
impress.server.restart = function() {
  if (api.cluster.isMaster) console.log('Restarting...'.green);
  if (impress.config) impress.stop(function() {
    if (api.cluster.isMaster) console.log('  Reloading server configuration');
    impress.server.start();
  });
};

// Final shutdown
//
impress.shutdown = function() {
  if (api.cluster.isMaster) {
    impress.log.server('Stopped');
    impress.server.stop();
    var workerId;
    for (workerId in api.cluster.workers) api.cluster.workers[workerId].kill();
    console.log('Impress shutting down'.green.bold);
  } else impress.log.server('Terminated');
  impress.log.close(function() {
    process.exit(0);
  });
};

// Start TCP, HTTP and HTTPS servers
//
impress.startServers = function() {
  var servers = impress.config.servers,
      workerId = 0,
      server, serverName, certificate, certDir;
  if (impress.config.scale.strategy === 'sticky' && impress.isWin) {
    impress.config.scale.strategy = 'single';
    if (master) console.log('Fallback to "single" strategy on windows, because "sticky" need named pipe'.red.bold);
  }
  var single = impress.config.scale.strategy === 'single',
      specialization = impress.config.scale.strategy === 'specialization',
      sticky = impress.config.scale.strategy === 'sticky',
      multiple = impress.config.scale.strategy === 'multiple',
      cloned = multiple || sticky,
      master = api.cluster.isMaster;

  for (serverName in servers) {
    server = servers[serverName];
    certificate = null;

    if (server.protocol === 'https') {
      if (server.key && server.cert) {
        certDir = impress.configDir + '/ssl/';
        certificate = {
          key:  api.fs.readFileSync(certDir + server.key),
          cert: api.fs.readFileSync(certDir + server.cert)
        };
      } else impress.fatalError('SSL certificate is not configured for HTTPS');
    }
    if (master) {
      if (single) {
        if (server.protocol === 'https')
          server.listener = api.https.createServer(certificate, impress.dispatcher);
        else server.listener = api.http.createServer(impress.dispatcher);
        if (impress.websocket) impress.websocket.upgradeServer(server.listener);
      } else if (cloned) {
        if (sticky)
          server.listener = api.net.createServer(impress.balancer);
        else server.listener = {
          close: function(callback) { callback(); },
          on: function() { },
          listen: function() { }
        };
      } else if (specialization && isFirstStart) impress.forkWorker(workerId++, serverName);
      console.log('  ' + server.protocol.toUpperCase() + ' listen on ' + server.address + ':' + server.port);
    } else if (cloned || impress.serverName === serverName) {
      if (server.protocol === 'https')
        server.listener = api.https.createServer(certificate, impress.dispatcher);
      else server.listener = api.http.createServer(impress.dispatcher);
      if (impress.websocket) impress.websocket.upgradeServer(server.listener);
    }
    if (server.listener) {
      server.listener.on('error', function(e) {
        console.dir(e);
        if (e.code === 'EADDRINUSE' || e.code === 'EACCESS' || e.code === 'EACCES') {
          impress.fatalError('Can`t bind to host/port');
        }
      });
      server.listener.on('timeout', function(socket) {
        if (socket.client) socket.client.error(408, socket);
      });
      server.listener.serverName = serverName;
      if ((master && !specialization) || (!master && !cloned)) {
        if (server.nagle === false) {
          server.listener.on('connection', function(socket) {
            socket.setNoDelay();
          });
        }
        if (server.address === '*') server.listener.listen(server.port);
        else server.listener.listen(server.port, server.address);
      } else {
        if (impress.config.scale.strategy === 'sticky') server.listener.listen(null);
        else if (server.address === '*') server.listener.listen(server.port);
        else server.listener.listen(server.port, server.address);
      }
    }
  }
};

// Start IPC
//
impress.startIpc = function() {
  process.on('SIGINT', impress.shutdown);
  process.on('SIGTERM', impress.shutdown);

  if (api.cluster.isMaster && isFirstStart) {
    if (impress.config.scale.strategy === 'multiple' || impress.config.scale.strategy === 'sticky') {
      var workerId;
      for (workerId = 0; workerId < impress.config.scale.workers; workerId++) {
        impress.forkWorker(workerId);
      }
    }
  } else {
    // Receive events from master
    process.on('message', function(message, socket) {
      var application = impress.applications[message.appName];
      if (message.name === 'impress:socket') {
        var server, serverName, servers = impress.config.servers;
        for (serverName in servers) {
          server = servers[serverName];
          if (server.address === message.address && server.port === message.port) {
            socket.server = server.listener;
            server.listener.emit('connection', socket);
          }
        }
      } else if (message.name === 'impress:event') {
        // Retranslate events from master to worker
        if (application) {
          if (message.user)         application.events.sendToUser(message.user, message.event, message.data, true);
          else if (message.channel) application.events.sendToChannel(message.channel, message.event, message.data, true);
          else if (message.global)  application.events.sendGlobal(message.event, message.data, true);
          else if (message.server)  application.events.sendToServer(message.event, message.data, true);
          // else if (message.cluster) application.events.sendToCluster(message.event, message.data, true);
        }
      } else if (message.name === 'impress:forklongworker') {
        delete message.name;
        if (application) application.workers[message.nodeId] = message;
      } else if (message.name === 'impress:exitlongworker') {
        if (application) delete application.workers[message.nodeId];
      }
    });
  }
};

// Fork new worker
// bind worker to serverName from config if serverName defined
//
impress.forkWorker = function(workerId, serverName) {
  var worker, env = {};
  env['WORKER_ID'] = workerId + 1;
  env['WORKER_TYPE'] = 'cluster';
  if (typeof(serverName) !== 'undefined') env['WORKER_SERVER_NAME'] = serverName;
  impress.nextWorkerId++;
  worker = api.cluster.fork(env);
  worker.nodeId = impress.config.scale.cluster + 'N' + (workerId + 1);
  impress.stat.forkCount++;
  worker.on('exit', function(code, signal) {
    impress.stat.forkCount--;
    if (!worker.suicide) impress.forkWorker(workerId);
  });
  impress.listenWorker(worker);
};

// Fork long worker
//   appName    - application name to run worker in application context (config and database connections)
//   workerFile - filename with path
//   clientData - JSON serialized client request data
//
impress.forkLongWorker = function(appName, workerFile, clientData) {
  var application = impress.applications[appName];
  if (application) {
    if (api.cluster.isMaster) {
      var env = {},
          workerId = impress.nextWorkerId;
      env['WORKER_ID'] = workerId;
      env['WORKER_TYPE'] = 'long';
      env['WORKER_FILE'] = workerFile;
      env['WORKER_APPNAME'] = appName;
      env['WORKER_CLIENT'] = clientData;
      impress.nextWorkerId++;
      var worker = api.cluster.fork(env);
      worker.file = workerFile;
      worker.nodeId = impress.config.scale.cluster + 'L' + workerId;
      impress.listenWorker(worker);
      application.longWorkers[worker.id] = worker;
      impress.stat.forkCount++;
      worker.on('exit', function(code, signal) {
        impress.retranslateEvent(-1, { name:'impress:exitlongworker', appName: appName, nodeId: worker.nodeId });
        impress.stat.forkCount--;
        delete application.longWorkers[worker.id];
        delete application.workers[worker.nodeId];
      });
      return worker;
    } else process.send({
      name: 'impress:forklongworker',
      appName: appName,
      workerFile: workerFile,
      clientData: clientData
    });
  }
};

// Kill long worker
//   appName    - application name
//   workerFile - filename with path
//   nodeId     - kill worker by id
//
impress.killLongWorker = function(appName, workerFile, nodeId) {
  var application = impress.applications[appName];
  if (application) {
    if (api.cluster.isMaster) {
      var workerId, worker;
      for (workerId in application.longWorkers) {
        worker = application.longWorkers[workerId];
        if (worker.file === workerFile && (!nodeId || (worker.nodeId === nodeId))) {
          impress.log.server('Kill ' + worker.process.pid + '/' + worker.nodeId);
          worker.kill();
          impress.stat.forkCount++;
        }
      }
    } else process.send({
      name: 'impress:killlongworker',
      appName: appName,
      workerFile: workerFile
    });
  }
};

// Initialize IPC for interprocess event routing
// Master receive events from workers here
//
impress.listenWorker = function(worker) {
  worker.on('message', function(message) {
    var application = impress.applications[message.appName];
    if (application) {
      // propagate to all workers except of original sender
      if (message.name === 'impress:event' || message.name === 'impress:state') {
        impress.stat.eventCount++;
        if (api.cluster.isMaster && (impress.config.scale.instance === 'server')) {
          console.log(api.stringify(message));
          impress.scale.req.send(api.stringify(message));
        }
        impress.retranslateEvent(worker.id, message);
      } else if (message.name === 'impress:forklongworker') {
        var longWorker = impress.forkLongWorker(message.appName, message.workerFile, message.clientData);
        message.pid = longWorker.process.pid;
        message.nodeId = longWorker.nodeId;
        impress.retranslateEvent(-1, message);
        delete message.name;
        application.workers[message.nodeId] = message;
      } else if (message.name === 'impress:killlongworker') {
        impress.killLongWorker(message.appName, message.workerFile);
      }
    }
  });
};

// Retranslate IPC event to all workers except one
//
impress.retranslateEvent = function(exceptWorkerId, message) {
  var workerId;
  for (workerId in api.cluster.workers) {
    if (workerId !== exceptWorkerId + '') api.cluster.workers[workerId].send(message);
  }
};

// Dispatch requests
//
impress.dispatcher = function(req, res) {
  impress.stat.requestCount++;
  var isDispatched = false,
      staticRx = null,
      host = impress.parseHost(req.headers.host),
      application, appName, client, route, iRoute, match, urlRoute, form;

  for (appName in impress.applications) {
    application = impress.applications[appName];
    if (application.hostsRx.test(host)) {
      client = new application.Client(application, req, res);

      if (application.config.files.staticRx) staticRx = application.config.files.staticRx;
      if (application.config.application.slowTime) client.slowTime = application.config.application.slowTime;

      if (application.config.routes) {
        for (iRoute = 0; iRoute < application.config.routes.length; iRoute++) {
          route = application.config.routes[iRoute];
          match = req.url.match(route.urlRx);
          if (match) {
            if (route.slowTime) client.slowTime = route.slowTime;
            urlRoute = req.url;
            if (route.rewrite && match.length > 1) {
              urlRoute = route.rewrite.replace(/\[([0-9]+)\]/g, function(s, key) {
                return match[key] || '';
              });
            } else urlRoute = route.rewrite;
            req.usedRoutes = req.usedRoutes || [];
            if (route.host) client.proxy(route.host, route.port || 80, urlRoute);
            else if (inArray(req.usedRoutes, iRoute)) client.error(508); else {
              req.url = urlRoute;
              req.usedRoutes.push(iRoute);
              impress.dispatcher(req, res);
            }
            return;
          }
        }
      }
      if (staticRx && staticRx.test(client.url)) client.static();
      else {
        if (impress.HTTP_VEBS.indexOf(client.method) > 0) { // post, put, delete
          var contentType = req.headers['content-type'];
          if (contentType && contentType.startsWith('multipart')) {
            form = new api.multiparty.Form();
            form.parse(req, function(err, fields, files) {
              if (err) client.error(400);
              else {
                client.files = files;
                client.fields = fields;
                extend(client.parameters, client.fields);
                client.restoreSession();
              }
            });
          } else {
            client.data = '';
            req.on('data', function(chunk) {
              client.data += chunk;
            });
            req.on('end', function() {
              if (contentType && contentType.startsWith('application/json')) client.fields = JSON.parse(client.data);
              else client.fields = api.querystring.parse(client.data);
              extend(client.parameters, client.fields);
              client.restoreSession();
            });
          }
        } else client.restoreSession();
      }
      return;
    }
  }
  // No application detected to dispatch request to the host
  if (!isDispatched) {
    client = new impress.Client(impress, req, res);
    client.application = impress;
    client.accessLog();
    client.error(404);
  }
};

// Balancer for sticky mode
//
impress.balancer = function(socket) {
  var ip;
  if (impress.config.scale.strategy === 'sticky') ip = ip2int(socket.remoteAddress);
  else if (impress.config.scale.strategy === 'multiple') ip = ~~(Math.random() * impress.config.scale.workers);

  var worker = api.cluster.workers[Math.abs(ip) % impress.config.scale.workers],
      server = impress.config.servers[socket.server.serverName];
  worker.send({ name: 'impress:socket', address: server.address, port: server.port }, socket);
};

// Clear cache hash starts with given substring
//
impress.clearCacheStartingWith = function(cache, startsWith, callback) {
  var key;
  for (key in cache) if (key.startsWith(startsWith)) {
    delete cache[key];
    if (callback) callback(key);
  }
};

// Update changed file in cache
//
impress.updateFileCache = function(application, filePath, stats) {
  var ext = impress.fileExt(filePath);
  impress.clearCacheStartingWith(application.cache.pages, filePath);
  if (filePath in application.cache.static) {
    // Replace static files memory cache
    application.compress(filePath, stats);
  } else if (ext === 'js' && (filePath in application.cache.scripts)) {
    // Replace changed js file in cache
    application.cache.scripts[filePath] = null;
    application.createScript(filePath, function(err, exports) {
      application.cache.scripts[filePath] = exports;
      var sectionName = api.path.basename(filePath, '.js');
      if (filePath.startsWith(application.configDir)) {
        // Reload config
        application.config[sectionName] = exports;
        application.preprocessConfig();
      } else if (filePath.startsWith(application.tasksDir)) {
        // Reload task
        application.setTask(sectionName, exports);
      }
    });
  } else if (ext === 'template') {
    // Replace changed template file in cache
    delete application.cache.templates[filePath];
    delete application.cache.files[filePath];
    api.fs.readFile(filePath, 'utf8', function(err, tpl) {
      if (!err) {
        if (!tpl) tpl = impress.FILE_IS_EMPTY;
        else tpl = impress.removeBOM(tpl);
        application.cache.templates[filePath] = tpl;
      }
    });
  }
};

// Clear cache for all changed folders (created or deleted files)
//
impress.cliearDirectoryCache = function(application, filePath) {
  impress.clearCacheStartingWith(application.cache.static, filePath);
  impress.clearCacheStartingWith(application.cache.folders, filePath);
  impress.clearCacheStartingWith(application.cache.pages, filePath);
  impress.clearCacheStartingWith(application.cache.files, filePath, function(used) {
    var ext = impress.fileExt(used);
    if (ext === 'js' && (used in application.cache.scripts)) {
      delete application.cache.scripts[used];
    } else if (ext === 'template' && (used in application.cache.templates)) {
      delete application.cache.templates[used];
    }
  });
};

// Cache watchers
//   filePath - absolute path to file or directory to watch
//
impress.watchCache = function(application, filePath) {
  var watchInterval = impress.getByPath(impress.config, 'scale.watchInterval') || 2000,
      watcher, path = filePath;
  if (!filePath.endsWith('/')) path = api.path.dirname(path) + '/';
  if (application) {
    watcher = application.cache.watchers[path];
    if (!watcher) {
      api.fs.exists(path, function(exists) {
        if (exists) {
          watcher = api.fs.watch(path, function(event, fileName) {
            var filePath = (fileName) ? path + fileName : path,
                watcher = application.cache.watchers[path];
            if (watcher.timers[filePath]) clearTimeout(watcher.timers[filePath]);
            watcher.timers[filePath] = setTimeout(function() {
              api.fs.exists(filePath, function(exists) {
                if (exists) {
                  api.fs.stat(filePath, function(err, stats) {
                    if (err) return;
                    if (stats.isFile()) impress.updateFileCache(application, filePath, stats);
                    else impress.cliearDirectoryCache(application, filePath);
                  });
                }
              });
            }, watchInterval);
          });
          watcher.on('error', function() { watcher.close(); });
          watcher.timers = [];
          application.cache.watchers[path] = watcher;
        }
      });
    }
  }
};
