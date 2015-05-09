'use strict';

global.impress = {};
global.api = {};

api.console = console;
api.require = require;
api.os = require('os');
api.vm = require('vm');

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
api.childProcess = require('child_process');
api.exec = api.childProcess.exec;
api.stringDecoder = require('string_decoder').StringDecoder;

// External modules
//
api.async = require('async');
api.mkdirp = require('mkdirp');
api.colors = require('colors');
api.multiparty = require('multiparty');
api.iconv = require('iconv-lite');
api.stringify = require('json-stringify-safe');
api.csv = require('csv');
api.zipstream = require('zip-stream');

// Impress core modules
//
require('./impress.constants');
if (process.execArgv.indexOf('--allow-natives-syntax') >= 0) require('./api.v8');
require('./api.impress');
require('./api.definition');
require('./impress.application');
require('./impress.client');
require('./impress.templating');
require('./impress.index');
require('./impress.files');
require('./impress.security');

// Paths to directories
//
impress.dir = process.cwd().replace(/\\/g, '/');
impress.applicationsDir = impress.dir + '/applications';
impress.moduleDir = api.path.dirname(__dirname);

// Load configuration definition
//
impress.serverConfigDefinition = api.definition.require('config.impress.definition');
impress.applicationConfigDefinition = api.definition.require('config.application.definition');

// Intercept uncaught exception
//
process.on('uncaughtException', function(err) {
  if (impress.logException) {
    if (err.code === 'EINVAL') impress.fatalError('Can`t bind to host/port +1');
    else impress.logException(err);
  } else {
    console.log('Can\'t log uncaught Exception');
    console.log(err.stack);
  }
  impress.shutdown();
});

// Impress safe require
//
impress.require = function(moduleName) {
  if (impress.API_ALIASES[moduleName]) {
    moduleName = impress.API_ALIASES[moduleName];
  }
  var lib = null;
  try {
    lib = require(moduleName);
  } catch(err) {}
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
impress.server.status = impress.SRV_STATUS_STARTING;
impress.preprocess = {};
impress.nextWorkerId = 1;
impress.appNames = [];

// Load plugins
//
impress.loadPlugins = function() {
  var plugins = api.impress.getByPath(impress, 'config.sandbox.plugins');
  if (plugins) {
    var pluginName, cache;
    for (var i = 0; i < plugins.length; i++) {
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
  var config, hosts, appName, cmp = [];
  for (var n = 0; n < impress.appNames.length; n++) {
    appName = impress.appNames[n];
    config = impress.applications[appName].config;
    if (config) {
      hosts = config.hosts;
      if (hosts) {
        for (var i = 0; i < hosts.length; i++) {
          for (var j = 0; j < cmp.length; j++) {
            if (impress.compareMasks(hosts[i], cmp[j])) {
              console.log(('  Hosts mask overlapping: "' + hosts[i] + '" and "' + cmp[j] + '"').red.bold);
            }
          }
        }
        for (var k = 0; k < hosts.length; k++) {
          if (cmp.indexOf(hosts[k]) === -1 ) cmp.push(hosts[k]);
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
    impress.log.close(function() {
      process.exit(1);
    });
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
      callback();
    } else {
      impress.appNames = apps;
      api.async.each(apps, function(appName, cb) {
        var dir = impress.applicationsDir + '/' + appName,
            stats = api.fs.statSync(dir),
            linkFile = dir + '/application.link',
            existsLink = api.fs.existsSync(linkFile);
        if (existsLink) {
          var appLink = api.fs.readFileSync(linkFile, 'utf8');
          dir = api.impress.removeBOM(appLink);
          dir = api.path.resolve(impress.dir, dir);
        }
        if (stats.isDirectory() && (!impress.workerApplicationName || impress.workerApplicationName === appName)) {
          var application = new api.events.EventEmitter();
          application.name = appName;
          application.dir = dir;
          impress.mixinApplication(application);
          application.createSandbox(function() {
            impress.security.mixinApplication(application);
            application.loadConfig(function() {
              impress.applications[application.name] = application;
              application.preprocessConfig();
              impress.log.mixinApplication(application);
              application.log.open(function() {
                application.loadPlaces(function() {
                  if (application.config.application && application.config.application.preload) {
                    application.preloadDirectory('/');
                  }
                  cb();
                });
              });
            });
          });
        } else cb();
      }, callback);
    }
  });
};

var isFirstStart = true;

// Start servers
//
impress.server.start = function() {
  impress.mixinApplication(impress);
  impress.createSandbox(function() {
    impress.mode = process.env['IMPRESS_MODE'] || '';
    impress.workerId = api.cluster.isMaster ? 0 : process.env['WORKER_ID'];
    impress.workerType = process.env['WORKER_TYPE'];
    impress.serverName = process.env['WORKER_SERVER_NAME'];
    if (api.cluster.isMaster) console.log('Impress Application Server'.green.bold + ' starting, reading configuration'.green);
    impress.loadConfig(function() {
      impress.preprocessConfig();
      require('./impress.log');
      impress.loadPlugins();
      impress.log.mixinApplication(impress);
      impress.log.open(function() {
        if (impress.workerType === 'long') {
          impress.nodeId = impress.config.scale.cluster + 'L' + impress.workerId;
          process.title = 'impress ' + impress.nodeId;
          impress.workerApplicationName = process.env['WORKER_APPNAME'];
          impress.workerApplicationFile = process.env['WORKER_FILE'];
          impress.workerApplicationClient = JSON.parse(process.env['WORKER_CLIENT']);
          impress.workerApplicationClient.runScript = impress.Client.prototype.runScript;
        } else {
          impress.nodeId = impress.config.scale.cluster + 'N' + impress.workerId;
          process.title = 'impress' + (api.cluster.isMaster ? ' srv' : ' ' + impress.nodeId);
        }
        impress.processMarker = (api.cluster.isMaster ? 'Master':'Worker') + '(' + process.pid + '/' + impress.nodeId + ')';
        if (api.cluster.isMaster && impress.config.scale && impress.config.scale.check) {
          console.log('Startup check: '.green + impress.config.scale.check);
          api.http.get(impress.config.scale.check, function(res) {
            if (res.statusCode === 404) impress.server.startup();
            else impress.fatalError(impress.ALREADY_STARTED);
          }).on('error', impress.server.startup);
        } else impress.server.startup();
      });
    });
  });
};

// Stattup server
//
impress.server.startup = function() {
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
      impress.workerApplicationClient.application = application;
      impress.workerApplicationClient.access = { allowed: true };
      impress.workerApplicationClient.runScript('worker', impress.workerApplicationFile, function() {
        impress.log.server('Terminated');
        impress.log.close(function() {
          process.exit(0);
        });
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
  impress.server.status = impress.SRV_STATUS_WORKING;
};

// Unload configuration and stop server
//
impress.server.stop = function(callback) {
  var servers = impress.config.servers;
  impress.clearCache();
  if (servers) {
    api.async.each(Object.keys(servers), function(serverName, cb) {
      var server = servers[serverName];
      if (server.listener) server.listener.close(function() {
        var application, appName;
        for (var n = 0; n < impress.appNames.length; n++) {
          appName = impress.appNames[n];
          application = impress.applications[appName];
          application.stopTasks();
          application.clearCache();
        }
        cb();
      }); else cb();
    }, callback);
  } else {
    console.log('No servers active');
    callback();
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
  if (impress.server.status === impress.SRV_STATUS_WORKING && impress.log) {
    impress.server.status = impress.SRV_STATUS_STOPPING;
    if (api.cluster.isMaster || impress.config.scale.strategy === 'single') {
      impress.log.server('Stopped');
      impress.server.stop();
      //for (var workerId in api.cluster.workers) api.cluster.workers[workerId].kill();
      console.log('Impress shutting down'.green.bold);
    } else impress.log.server('Terminated');
    impress.log.close(function() {
      process.exit(0);
    });
  }
};

// Start TCP, HTTP and HTTPS servers
//
impress.startServers = function() {
  var server, servers = impress.config.servers,
      workerId = 0,
      certificate, certDir;

  var single = impress.config.scale.strategy === 'single',
      specialization = impress.config.scale.strategy === 'specialization',
      sticky = impress.config.scale.strategy === 'sticky',
      multiple = impress.config.scale.strategy === 'multiple',
      cloned = multiple || sticky,
      master = api.cluster.isMaster;

  var serverName, serverNames = Object.keys(servers);
  for (var n = 0; n < serverNames.length; n++) {
    serverName = serverNames[n];
    server = servers[serverName];
    certificate = null;

    if (server.protocol === 'https') {
      if (server.key && server.cert) {
        certDir = impress.dir + '/config/ssl/';
        certificate = {
          key:  api.fs.readFileSync(certDir + server.key),
          cert: api.fs.readFileSync(certDir + server.cert)
        };
      } else impress.fatalError('SSL certificate is not configured for HTTPS');
    }
    if (master) {
      if (single) {
        if (server.protocol === 'https') server.listener = api.https.createServer(certificate, impress.dispatcher);
        else server.listener = api.http.createServer(impress.dispatcher);
        if (impress.websocket) impress.websocket.upgradeServer(server.listener);
      } else if (sticky) server.listener = api.net.createServer(impress.balancer);
      else if (multiple) server.listener = { close: api.impress.emptyness, on: api.impress.emptyness, listen: api.impress.emptyness };
      else if (specialization && isFirstStart) impress.forkWorker(workerId++, serverName);
      console.log('  ' + server.protocol.toUpperCase() + ' listen on ' + server.address + ':' + server.port);
    } else if (cloned || impress.serverName === serverName) {
      if (server.protocol === 'https') server.listener = api.https.createServer(certificate, impress.dispatcher);
      else server.listener = api.http.createServer(impress.dispatcher);
      if (impress.websocket) impress.websocket.upgradeServer(server.listener);
    }
    if (server.listener) {
      server.listener.on('error', impress.serverOnError);
      server.listener.on('timeout', impress.serverOnTimeout);
      server.listener.serverName = serverName;
      if ((master && !specialization) || (!master && !cloned)) {
        if (server.nagle === false) server.listener.on('connection', impress.serverSetNoDelay);
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

// Detect bind error (note: some node.js versions have error in constant name)
//
impress.serverOnError = function(e) {
  if (e.code === 'EADDRINUSE' || e.code === 'EACCESS' || e.code === 'EACCES') {
    if (api.cluster.isWorker) {
      process.send({ name: 'impress:exit', error: 'Can`t bind to host/port' });
      //process.exit(0);
    } else impress.fatalError('Can`t bind to host/port');
  }
};

// Send request timeout
//
impress.serverOnTimeout = function(socket) {
  if (socket.client) socket.client.error(408, socket);
};

// Disable nagle's algorithm
//
impress.serverSetNoDelay = function(socket) {
  socket.setNoDelay();
};

// Start IPC
//
impress.startIpc = function() {
  process.on('SIGINT', impress.shutdown);
  process.on('SIGTERM', impress.shutdown);

  if (api.cluster.isMaster && isFirstStart) {
    if (impress.config.scale.strategy === 'multiple' || impress.config.scale.strategy === 'sticky') {
      for (var workerId = 0; workerId < impress.config.scale.workers; workerId++) {
        impress.forkWorker(workerId);
      }
    }
  } else {
    // Receive events from master
    process.on('message', function(message, socket) {
      var application = impress.applications[message.appName];
      if (message.name === 'impress:socket') {
        var server, servers = impress.config.servers,
            serverName, serverNames = Object.keys(servers);
        for (var n = 0; n < serverNames.length; n++) {
          serverName = serverNames[n];
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
      var worker;
      for (var workerId in application.longWorkers) {
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
    if (message.name === 'impress:exit') impress.fatalError(message.error);
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
  for (var workerId in api.cluster.workers) {
    if (workerId !== exceptWorkerId + '') api.cluster.workers[workerId].send(message);
  }
};

// Dispatch requests
//
impress.dispatcher = function(req, res) {
  impress.stat.requestCount++;
  var application, appName,
      host = api.impress.parseHost(req.headers.host);
  for (var n = 0; n < impress.appNames.length; n++) {
    appName = impress.appNames[n];
    application = impress.applications[appName];
    if (application && application.hostsRx.test(host)) return application.dispatch(req, res);
  }
  // No application detected to dispatch request to the host
  var client = new impress.Client(impress, req, res);
  client.application = impress;
  client.accessLog();
  client.error(404);
};

// Balancer for sticky mode
//
impress.balancer = function(socket) {
  var ip;
  if (impress.config.scale.strategy === 'sticky') ip = api.impress.ip2int(socket.remoteAddress);
  else if (impress.config.scale.strategy === 'multiple') ip = ~~(Math.random() * impress.config.scale.workers);

  var worker = api.cluster.workers[Math.abs(ip) % impress.config.scale.workers],
      server = impress.config.servers[socket.server.serverName];
  worker.send({ name: 'impress:socket', address: server.address, port: server.port }, socket);
};
