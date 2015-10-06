'use strict';

// Impress Application Server
//
require('./api');
global.impress = new api.events.EventEmitter();

impress.isMainApplication = true;

// Impress core modules
//
require('./impress.constants');
require('./impress.application');
require('./impress.client');
require('./impress.templating');
require('./impress.index');
require('./impress.files');
require('./impress.security');
require('./impress.health');
require('./impress.cloud');
require('./impress.preprocess');
require('./impress.waf');
require('./db');

// Paths to directories
//
impress.dir = process.cwd().replace(impress.BACKSLASH_REGEXP, '/');
impress.applicationsDir = impress.dir + '/applications';
impress.moduleDir = api.path.dirname(__dirname);

// Load configuration definition
//
impress.serverConfigDefinition = api.definition.require('config.impress.definition');
impress.applicationConfigDefinition = api.definition.require('config.application.definition');

// Intercept uncaught exception
//
process.on('uncaughtException', function(err) {
  if (err.code === 'EINVAL') impress.fatalError('Can`t bind to host/port');
  else api.impress.logException(err);
  impress.shutdown();
});

// Parse command line to extract memory limit
//
process.execArgv.forEach(function(val) {
  if (val.indexOf('--max_old_space_size') === 0) {
    var sp = val.split('=');
    if (sp[1]) impress.memoryLimit = parseInt(sp[1], 10) * 900000;
  }
});

// If memory limit detected we can check it periodically (5s by default)
//
if (impress.memoryLimit) {
  setInterval(function() {
    var mu = process.memoryUsage();
    if (mu.heapTotal > impress.memoryLimit) {
      impress.clearCache();
      var application, appName;
      for (appName in impress.applications) {
        application = impress.applications[appName];
        application.clearCache();
      }
      mu = process.memoryUsage();
      if (mu.heapTotal > impress.memoryLimit) {
        impress.fatalError('Memory limit exceeded: ' + api.impress.bytesToSize(mu.heapTotal) + ', restarting');
      }
    }
  }, impress.MEMORY_LIMIT_CHECK_INTERVAL);
}

impress.stat = {
  forkCount: 0,
  eventCount: 0,
  requestCount:  0,
  responseCount: 0
};

impress.applications = {};
impress.server = new api.events.EventEmitter();
impress.server.status = impress.SRV_STATUS_STARTING;
impress.nextWorkerId = 1;

// Load plugins
//
impress.loadPlugins = function() {
  var pluginName, pluginPath, cache;
  for (var i = 0, len = impress.CORE_PLUGINS.length; i < len; i++) {
    pluginName = impress.CORE_PLUGINS[i];
    pluginPath = './impress.' + pluginName + '.js';
    cache = require.cache[require.resolve(pluginPath)];
    if (!cache) require(pluginPath);
  }
};

// Mixin plugins
//
impress.mixinPlugins = function(application) {
  var plugin, pluginName;
  for (var i = 0, len = impress.CORE_PLUGINS.length; i < len; i++) {
    pluginName = impress.CORE_PLUGINS[i];
    plugin = impress[pluginName];
    plugin.mixinApplication(application);
  }
};

// Compare masks
//
impress.compareMasks = function(m1, m2) {
  return (m1 === m2 || m1 === '*' || m2 === '*');
};

// Compare hosts
//
impress.compareHosts = function() {
  var config, hosts, appName, cmp = [];
  for (appName in impress.applications) {
    config = impress.applications[appName].config;
    if (config) {
      hosts = config.hosts;
      if (hosts) {
        for (var i = 0, ilen = hosts.length; i < ilen; i++) {
          for (var j = 0, jlen = cmp.length; j < jlen; j++) {
            if (impress.compareMasks(hosts[i], cmp[j])) {
              impress.log.warning('Hosts mask overlapping: "' + hosts[i] + '" and "' + cmp[j] + '"');
            }
          }
        }
        for (var k = 0, klen = hosts.length; k < klen; k++) {
          if (cmp.indexOf(hosts[k]) === -1) cmp.push(hosts[k]);
        }
      }
    }
  }
};

// Fatal error with process termination
//   msg - fatal error message
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

// Detect application directory
//   appName - application name
//   callback - function(dir)
//     dir - path to directory or null
//
impress.detectAppDir = function(appName, callback) {
  var dir, linkFile;
  dir = impress.applicationsDir + '/' + appName;
  linkFile = dir + '/application.link';
  api.fs.stat(dir, function(err, stats) {
    if (!err && stats.isDirectory()) {
      api.fs.exists(linkFile, function(existsLink) {
        if (existsLink) {
          api.fs.readFile(linkFile, function(err, appLink) {
            dir = api.impress.removeBOM(appLink);
            dir = api.path.resolve(impress.dir, dir);
            callback(dir);
          });
        } else callback(dir);
      });
    } else callback(null);
  });
};

// Load applications
//   callback - function on finish
//
impress.loadApplications = function(callback) {
  if (impress.workerApplicationName) {
    impress.detectAppDir(impress.workerApplicationName, function(dir) {
      if (dir) impress.loadApplication(impress.workerApplicationName, dir, callback);
      else callback();
    });
  } else api.fs.readdir(impress.applicationsDir, function(err, apps) {
    if (err) {
      impress.fatalError(impress.CANT_READ_DIR + impress.applicationsDir);
      callback();
    } else {
      api.async.each(apps, function(appName, cb) {
        impress.detectAppDir(appName, function(dir) {
          if (dir) impress.loadApplication(appName, dir, callback);
          else cb();
        });
      }, function() {
        impress.linkNamespaces();
        callback();
      });
    }
  });
};

// Load application
//   appName - application name
//   dir - application directory
//   callback - function on finish
//
impress.loadApplication = function(appName, dir, callback) {
  var application = new api.events.EventEmitter();
  application.name = appName;
  application.dir = dir;
  impress.mixinApplication(application);
  impress.applications[application.name] = application;
  application.createSandbox(function() {
    application.loadConfig(function() {
      application.preprocessConfig();
      impress.log.mixinApplication(application);
      application.log.open(function() {
        application.emit('start');
        if (application.config.databases) api.db.openApplicationDatabases(application, function() {
          impress.mixinPlugins(application);
          application.loadPlaces(function() {
            application.emit('started');
            if (application.config.application && application.config.application.preload) {
              application.preloadDirectory('/');
            }
            callback();
          });
        });
      });
    });
  });
};

// Import/export namespaces after all applications loaded
//
impress.linkNamespaces = function() {
  var appName, application, exp, imp, impHash, impAppName, impApp, impObjName, expObjName, impObj;
  for (appName in impress.applications) {
    application = impress.applications[appName];
    imp = api.impress.getByPath(application, 'config.sandbox.import');
    if (imp) {
      for (impAppName in imp) {
        impHash = imp[impAppName];
        impApp = impress.applications[impAppName];
        exp = api.impress.getByPath(impApp , 'config.sandbox.export');
        if (impApp && impHash && exp) {
          for (expObjName in impHash) {
            impObjName = impHash[expObjName];
            impObj = api.impress.getByPath(impApp.sandbox, expObjName);
            if (exp.indexOf(expObjName) !== -1) api.impress.setByPath(application.sandbox, impObjName, impObj);
            else application.log.warning(
              'Application ' + appName + ' imports namespace ' + expObjName +
              ' from ' + impAppName + ' as ' + impObjName + ' but it is not exported'
            );
          }
        }
      }
    }
  }
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
      require('./impress.cloud.' + impress.config.scale.transport);
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
          process.title = 'impress ' + impress.nodeId;
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

// Startup server
//
impress.server.startup = function() {
  impress.startIpc();
  impress.loadApplications(function() {
    impress.server.emit('start');
    if (api.cluster.isMaster) {
      impress.log.server('Started server');
      impress.server.emit('master');
    } else {
      impress.log.server('Forked worker');
      impress.server.emit('worker');
    }
    if (impress.workerApplicationName) {
      var application = impress.applications[impress.workerApplicationName];
      impress.workerApplicationClient.application = application;
      impress.workerApplicationClient.access = { allowed: true };
      impress.workerApplicationClient.runScript('worker', impress.workerApplicationFile, function() {
        impress.log.server('Terminated worker');
        impress.log.close(function() {
          process.exit(0);
        });
      });
    }
  });
  if (!impress.workerApplicationName) {
    impress.startServers();
    impress.health.init();
    impress.cloud.init();
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
        for (appName in impress.applications) {
          application = impress.applications[appName];
          application.emit('stop');
          application.stopTasks();
          application.clearCache();
        }
        cb();
      }); else cb();
    }, callback);
  } else {
    impress.log.warning('No servers active');
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
      impress.log.server('Stopped server');
      impress.server.stop();
      console.log('Impress shutting down'.green.bold);
    } else impress.log.server('Terminated worker');
    impress.log.close(function() {
      process.exit(0);
    });
  }
};

// Start TCP, HTTP and HTTPS servers
//
impress.startServers = function() {
  var server, servers = impress.config.servers,
      workerId = 0;

  var single = impress.config.scale.strategy === 'single',
      bundle = impress.config.scale.strategy === 'bundle',
      sticky = impress.config.scale.strategy === 'sticky',
      multiple = impress.config.scale.strategy === 'multiple',
      cloned = multiple || sticky,
      master = api.cluster.isMaster;

  var msg, serverName, serverNames = Object.keys(servers);
  for (var n = 0, len = serverNames.length; n < len; n++) {
    serverName = serverNames[n];
    server = servers[serverName];
    server.name = serverName;
    if (master) {
      if (single) {
        if (server.protocol === 'https') {
          server.listener = api.https.createServer(impress.loadCertificates(server), impress.dispatcher);
        } else server.listener = api.http.createServer(impress.dispatcher);
        if (impress.websocket) impress.websocket.upgradeServer(server.listener);
      } else if (sticky) server.listener = api.net.createServer(impress.balancer);
      else if (multiple) server.listener = { close: api.impress.emptyness, on: api.impress.emptyness, listen: api.impress.emptyness };
      else if (bundle && isFirstStart) impress.forkWorker(workerId++, serverName);
      msg = server.protocol.toUpperCase() + ' listen on ' + server.address + ':' + server.port;
      console.log('  ' + msg);
      impress.log.server(msg);
    } else if (cloned || impress.serverName === serverName) {
      if (server.protocol === 'https') {
        server.listener = api.https.createServer(impress.loadCertificates(server), impress.dispatcher);
      } else server.listener = api.http.createServer(impress.dispatcher);
      if (impress.websocket) impress.websocket.upgradeServer(server.listener);
    }
    if (server.listener) {
      impress.setListenerError(server.listener, server.address + ':' + server.port);
      if (server.listener.setTimeout) {
        server.listener.keepAliveTimeout = server.keepAliveTimeout;
        server.listener.setTimeout(server.timeout, impress.serverOnTimeout);
      }
      server.listener.serverName = serverName;
      if ((master && !bundle) || (!master && !cloned)) {
        if (server.nagle === false) server.listener.on('connection', impress.serverSetNoDelay);
        if (server.address === '*') server.listener.listen(server.port);
        else server.listener.listen(server.port, server.address);
      } else {
        if (sticky) server.listener.listen(null);
        else if (server.address === '*') server.listener.listen(server.port);
        else server.listener.listen(server.port, server.address);
      }
    }
  }
};

// Load SSL certificates
//
impress.loadCertificates = function(server) {
  if (server.key && server.cert) {
    var certDir = impress.dir + '/config/ssl/';
    return {
      key: api.fs.readFileSync(certDir + server.key),
      cert: api.fs.readFileSync(certDir + server.cert)
    };
  } else impress.fatalError('SSL certificate is not configured for HTTPS');
};

// Detect bind error (note: some node.js versions have error in constant name)
//
impress.serverOnError = function(err) {
  if (err.code === 'EADDRINUSE' || err.code === 'EACCESS' || err.code === 'EACCES') {
    var msg = 'Can`t bind to host/port ' + err.address;
    if (api.cluster.isWorker) process.send({ name: 'impress:exit', error: msg });
    else impress.fatalError(msg);
  }
};

// Add error handler for certain address
//
impress.setListenerError = function(listener, address) {
  listener.on('error', function(err) {
    err.address = address;
    impress.serverOnError(err);
  });
};

// Send request timeout
//
impress.serverOnTimeout = function(socket) {
  if (socket.client && !socket.client.finished) {
    socket.client.timedOut = true;
    socket.client.error(408);
  } else socket.destroy();
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
      for (var workerId = 0, len = impress.config.scale.workers; workerId < len; workerId++) {
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
        for (var n = 0, len = serverNames.length; n < len; n++) {
          serverName = serverNames[n];
          server = servers[serverName];
          if (server.address === message.address && server.port === message.port) {
            socket.server = server.listener;
            server.listener.emit('connection', socket);
          }
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
  if (serverName !== undefined) env['WORKER_SERVER_NAME'] = serverName;
  impress.nextWorkerId++;
  worker = api.cluster.fork(env);
  worker.nodeId = impress.config.scale.cluster + 'N' + (workerId + 1);
  impress.stat.forkCount++;
  worker.on('exit', function(worker /* code, signal */) {
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
      worker.on('exit', function(worker /* code, signal */) {
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
      if (message.name === 'impress:forklongworker') {
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
  var worker;
  for (var workerId in api.cluster.workers) {
    worker = api.cluster.workers[workerId];
    if (!worker.suicide && workerId !== exceptWorkerId + '') worker.send(message);
  }
};

// Dispatch requests
//   req - request is an instance of http.IncomingMessage
//   res - rsponse is an instance of http.ServerResponse
//
impress.dispatcher = function(req, res) {
  impress.stat.requestCount++;
  var application, appName,
      host = api.impress.parseHost(req.headers.host);
  for (appName in impress.applications) {
    application = impress.applications[appName];
    if (application && application.hostsRx && application.hostsRx.test(host)) {
      return application.dispatch(req, res);
    }
  }
  // No application detected to dispatch request
  var client = new impress.Client(impress, req, res);
  client.error(404);
  return client;
};

// Balancer for sticky mode
//
impress.balancer = function(socket /* res */) {
  var ip, count = impress.config.scale.workers;
  if (impress.config.scale.strategy === 'sticky') ip = api.impress.ip2int(socket.remoteAddress);
  else if (impress.config.scale.strategy === 'multiple') ip = ~~(Math.random() * count);
  var id = (Math.abs(ip) % count) + 1,
      worker = api.cluster.workers[id],
      server = impress.config.servers[socket.server.serverName];
  if (worker) worker.send({ name: 'impress:socket', address: server.address, port: server.port }, socket);
};
