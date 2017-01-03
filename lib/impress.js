'use strict';

// Impress Application Server Core

process.isWin = !!process.platform.match(/^win/);
process.isWorker = 'WORKER_SERVER_NAME' in process.env;
process.isMaster = !process.isWorker;

require('./api.registry');
api.registry.load();

global.impress = new api.events.EventEmitter();
require('./impress.constants');

impress.isImpress = true;
impress.firstStart = true;
impress.dir = process.cwd().replace(impress.BACKSLASH_REGEXP, '/');
impress.applicationsDir = impress.dir + '/applications';
impress.moduleDir = api.path.dirname(__dirname);
impress.mode = process.env.IMPRESS_MODE || '';
impress.workerId = process.isMaster ? 0 : process.env.WORKER_ID;
impress.workerType = process.env.WORKER_TYPE;
impress.serverName = process.env.WORKER_SERVER_NAME;
impress.nextWorkerId = 1;
impress.applications = {};
impress.server = new api.events.EventEmitter();

impress.stat = {
  forkCount: 0,
  eventCount: 0,
  requestCount:  0,
  responseCount: 0
};

// Fork Impress process
//
impress.fork = (env, inspect) => {
  const modulePath = process.argv[1];
  const args = process.argv.slice(2);
  const argv = api.common.clone(process.execArgv);
  if (inspect) {
    argv.push('--inspect=' + inspect);
  }
  const opt = {
    env: Object.assign(process.env, env),
    execArgv: argv
  };
  return api.cp.fork(modulePath, args, opt);
};

// Load configuration definition
//
impress.serverConfigDefinition = api.definition.require(
  'config.impress.definition'
);
impress.applicationConfigDefinition = api.definition.require(
  'config.application.definition'
);

// Intercept uncaught exception
//
process.on('uncaughtException', (err) => {
  if (err.code === 'EINVAL') {
    impress.fatalError('Can`t bind to host/port');
  } else {
    impress.fatalError(err);
  }
  impress.shutdown(1);
});

// Parse command line to extract memory limit
//
process.execArgv.forEach((val) => {
  if (val.indexOf('--max_old_space_size') === 0) {
    const sp = val.split('=');
    if (sp[1]) impress.memoryLimit = parseInt(sp[1], 10) * 900000;
  }
});

// If memory limit detected we can check it periodically (5s by default)
//
if (impress.memoryLimit) {
  api.timers.setInterval(() => {
    let mu = process.memoryUsage();
    if (mu.heapTotal > impress.memoryLimit) {
      impress.cache.clear();
      let application, appName;
      for (appName in impress.applications) {
        application = impress.applications[appName];
        application.cache.clear();
      }
      mu = process.memoryUsage();
      if (mu.heapTotal > impress.memoryLimit) {
        impress.fatalError(
          'Memory limit exceeded: ' +
          api.common.bytesToSize(mu.heapTotal) +
          ', restarting'
        );
      }
    }
  }, impress.MEMORY_LIMIT_CHECK_INTERVAL);
}


// Execute function in sandboxed context
//
impress.callInContextScript = api.vm.createScript(
  'callInContext(global);', 'impress.vm'
);

// Call previously saved method if it exists in context
//
impress.callInContextMethod = (context) => {
  if (context && context.__callInContext) {
    context.__callInContext(context);
  }
};

// Load plugins
//
impress.loadPlugins = () => {
  let i, len, plugin, pluginName, pluginPath;
  for (i = 0, len = impress.CORE_PLUGINS.length; i < len; i++) {
    pluginName = impress.CORE_PLUGINS[i];
    pluginPath = './impress.' + pluginName + '.js';
    impress[pluginName] = {};
    require(pluginPath);
    plugin = impress[pluginName];
    if (plugin.mixImpress) plugin.mixin(impress);
  }
};

// Mixin plugins
//
impress.mixinPlugins = (application) => {
  let i, len, plugin, pluginName;
  for (i = 0, len = impress.CORE_PLUGINS.length; i < len; i++) {
    pluginName = impress.CORE_PLUGINS[i];
    plugin = impress[pluginName];
    application[pluginName] = {};
    if (plugin.mixin) plugin.mixin(application);
  }
};

// Compare masks
//
impress.compareMasks = (m1, m2) => (m1 === m2 || m1 === '*' || m2 === '*');

// Compare hosts
//
impress.compareHosts = () => {
  let i, j, k, ilen, jlen, klen, appName, config, hosts;
  const cmp = [];
  for (appName in impress.applications) {
    config = impress.applications[appName].config;
    if (config) {
      hosts = config.hosts;
      if (hosts) {
        for (i = 0, ilen = hosts.length; i < ilen; i++) {
          for (j = 0, jlen = cmp.length; j < jlen; j++) {
            if (impress.compareMasks(hosts[i], cmp[j])) {
              impress.log.warning(
                'Hosts mask overlapping: "' + hosts[i] +
                '" and "' + cmp[j] + '"'
              );
            }
          }
        }
        for (k = 0, klen = hosts.length; k < klen; k++) {
          if (cmp.indexOf(hosts[k]) === -1) cmp.push(hosts[k]);
        }
      }
    }
  }
};

// Fatal error with process termination
//   msg - fatal error message
//
impress.fatalError = (msg) => {
  if (impress.log && impress.log.error) {
    impress.log.server('Crashed');
    impress.log.error(msg);
    impress.log.close(() => {
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
impress.detectAppDir = (appName, callback) => {
  let dir = impress.applicationsDir + '/' + appName;
  const linkFile = dir + '/application.link';
  api.fs.stat(dir, (err, stats) => {
    if (!err && stats.isDirectory()) {
      api.fs.exists(linkFile, (existsLink) => {
        if (existsLink) {
          api.fs.readFile(linkFile, (err, appLink) => {
            dir = api.common.removeBOM(appLink);
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
impress.loadApplications = (callback) => {
  if (process.isMaster) callback();
  else if (impress.workerApplications) {
    impress.createApplications(callback);
  } else {
    const server = impress.config.servers[impress.serverName];
    if (server && server.applications) {
      impress.workerApplications = server.applications;
      impress.createApplications(callback);
    } else {
      api.fs.readdir(impress.applicationsDir, (err, apps) => {
        if (err) {
          impress.fatalError(impress.CANT_READ_DIR + impress.applicationsDir);
          callback();
        } else {
          impress.workerApplications = apps;
          impress.createApplications(callback);
        }
      });
    }
  }
};

// Load applications from impress.workerApplications
//   callback - function on finish
//
impress.createApplications = (callback) => {
  api.metasync.each(impress.workerApplications, (appName, cb) => {
    impress.detectAppDir(appName, (dir) => {
      if (dir) {
        const application = new api.events.EventEmitter();
        application.name = appName;
        application.dir = dir;
        impress.mixinPlugins(application);
        impress.applications[application.name] = application;
        application.createApplication(callback);
      } else cb();
    });
  }, () => {
    impress.linkNamespaces();
    callback();
  });
};

// Load application
//   appName - application name
//   dir - application directory
//   callback - function on finish
//
impress.loadApplication = (appName, dir, callback) => {
};

// Import/export namespaces after all applications loaded
//
impress.linkNamespaces = () => {
  let appName, application, exp, imp, impHash,
      impAppName, impApp, impObjName, expObjName, impObj;
  for (appName in impress.applications) {
    application = impress.applications[appName];
    imp = api.common.getByPath(application, 'config.sandbox.import');
    if (imp) {
      for (impAppName in imp) {
        impHash = imp[impAppName];
        impApp = impress.applications[impAppName];
        exp = api.common.getByPath(impApp, 'config.sandbox.export');
        if (impApp && impHash && exp) {
          for (expObjName in impHash) {
            impObjName = impHash[expObjName];
            impObj = api.common.getByPath(impApp.sandbox, expObjName);
            if (exp.indexOf(expObjName) !== -1) {
              api.common.setByPath(application.sandbox, impObjName, impObj);
            } else {
              application.log.warning(
                'Application ' + appName + ' imports namespace ' + expObjName +
                ' from ' + impAppName +
                ' as ' + impObjName + ' but it is not exported'
              );
            }
          }
        }
      }
    }
  }
};

// Start servers
//
impress.server.start = () => {
  impress.loadPlugins();
  if (process.isMaster) {
    console.log(
      'Impress Application Server'.green.bold +
      ' starting, reading configuration'.green
    );
  }
  impress.createSandbox(() => {
    impress.loadConfig(() => {
      if (impress.workerType === 'long') {
        process.title = 'impress ' + impress.nodeId;
        impress.workerApplications = [process.env.WORKER_APPNAME];
        impress.workerApplicationName = process.env.WORKER_APPNAME;
        impress.workerApplicationFile = process.env.WORKER_FILE;
        impress.workerApplicationClient = api.json.parse(
          process.env.WORKER_CLIENT
        );
        impress.workerApplicationClient.runScript = (
          impress.Client.prototype.runScript
        );
      } else {
        process.title = 'impress ' + (
          process.isMaster ? 'srv' : impress.nodeId
        );
      }
      impress.processMarker = (
        (process.isMaster ? 'Master' : 'Worker') +
        '(' + process.pid + '/' + impress.nodeId + ')'
      );
      if (
        process.isMaster &&
        impress.config.scale &&
        impress.config.scale.check
      ) {
        console.log('Startup check: '.green + impress.config.scale.check);
        api.http.get(impress.config.scale.check, (res) => {
          if (res.statusCode === 404) {
            impress.server.load();
          } else {
            impress.fatalError(impress.ALREADY_STARTED);
          }
        }).on('error', impress.server.load);
      } else {
        impress.server.load();
      }
    });
  });
};

// Load server
//
impress.server.load = () => {
  impress.ipc();
  impress.loadApplications(() => {
    if (process.isMaster) {
      impress.log.server('Started server');
    } else {
      process.send({ name: 'impress:start', id: impress.workerId });
      impress.log.server('Forked worker');
    }
    if (impress.workerApplicationName) {
      const application = impress.applications[impress.workerApplicationName];
      impress.workerApplicationClient.application = application;
      impress.workerApplicationClient.access = { allowed: true };
      impress.workerApplicationClient.runScript(
        'worker', impress.workerApplicationFile,
        () => impress.log.close(() => process.exit(0))
      );
    }
  });
  if (!impress.workerApplicationName) {
    impress.startServers();
    impress.health.init();
    impress.cloud.init();
  }
  // Set garbage collection interval
  if (typeof(global.gc) === 'function' && impress.config.scale.gc > 0) {
    api.timers.setInterval(global.gc, impress.config.scale.gc);
  }
  impress.firstStart = false;
};

// Establish IPC processing
//
impress.ipc = () => {
  process.on('SIGINT', impress.shutdown);
  process.on('SIGTERM', impress.shutdown);

  if (process.isWorker) {
    process.on('message', (message) => {
      // Message is a first parameter
      // Second parameter usually used for socket handle
      const application = impress.applications[message.appName];
      if (message.name === 'impress:forklongworker') {
        delete message.name;
        if (application) application.workers[message.nodeId] = message;
      } else if (message.name === 'impress:exitlongworker') {
        if (application) delete application.workers[message.nodeId];
      }
    });
    process.on('beforeExit', (code) => {
      process.send({ name: 'impress:exit', code });
      impress.log.server('Terminated worker');
    });
  }
};

// Unload configuration and stop server
//
impress.server.stop = () => {
  const servers = impress.config.servers;
  impress.cache.clear();
  if (servers) {
    const keys = Object.keys(servers);
    keys.forEach((serverName) => {
      const server = servers[serverName];
      if (server.instance) server.instance.close(() => {
        let application, appName;
        for (appName in impress.applications) {
          application = impress.applications[appName];
          application.emit('stop');
          application.stopTasks();
          application.cache.clear();
        }
      });
    });
  } else impress.log.warning('No servers active');
};

// Shutdown IAS
//
impress.shutdown = (code) => {
  if (!impress.finalization) {
    impress.finalization = true;
    if (code === undefined) code = 0;
    if (process.isMaster) {
      impress.killWorkers();
      impress.log.server('Stopped server');
      console.log('Impress shutting down'.green.bold);
      impress.log.close(() => {
        api.timers.setImmediate(() => {
          impress.server.stop();
          process.exit(code);
        });
      });
    } else {
      impress.log.server('Terminated worker');
      impress.log.close(() => process.exit(code));
    }
  }
};

// Start JSTP and HTTP servers
//
impress.startServers = () => {
  const servers = impress.config.servers;
  const serverNames = Object.keys(servers);

  impress.serversCount = serverNames.length;
  impress.serversStarted = 1;

  let workerId = 0;

  serverNames.forEach((serverName) => {
    const server = servers[serverName];
    server.name = serverName;

    if (process.isMaster) {
      if (serverName === 'master') {
        impress.startServer(server);
      } else if (impress.firstStart) {
        impress.forkWorker(workerId++, serverName, server.inspect);
      }
    } else if (serverName === impress.serverName) {
      impress.startServer(server);
    }
  });
};

// Start a specified server
//   server - server configuration
//
impress.startServer = (server) => {
  if (server.protocol === 'jstp') {
    server.instance = impress.jstp.createServer(server);
  } else if (server.protocol === 'http') {
    if (server.transport === 'tls') {
      server.instance = api.https.createServer(
        impress.loadCertificates(server),
        impress.dispatcher
      );
    } else {
      server.instance = api.http.createServer(impress.dispatcher);
    }
    impress.websocket.upgradeServer(server.instance);
  }

  if (!server.instance) {
    return;
  }

  impress.configureServer(server);
  impress.logServerStarted(server);

  if (server.address === '*') {
    server.instance.listen(server.port);
  } else {
    server.instance.listen(server.port, server.address);
  }
};

// Print information about a newly started server to stdout and logs
//   server - server configuration object
//
impress.logServerStarted = (server) => {
  let protocolName = server.protocol.toUpperCase();
  if (server.transport === 'tls') {
    protocolName += 'S';
  } else if (server.transport === 'ws' || server.transport === 'wss') {
    protocolName += '/' + server.transport.toUpperCase();
  }
  let message = (
    protocolName + ' listen on ' + server.address + ':' + server.port +
    ' by ' + impress.processMarker
  );
  if (server.name === 'master') {
    const instanceType = impress.config.scale.instance;
    if (instanceType === 'controller') {
      message += ' Cloud Controller';
    } else {
      message += ' Master Server';
    }
  }
  console.log('  ' + message);
  impress.log.server(message);
};

// Configure a newly created server
//   server - server configuration object
//
impress.configureServer = (server) => {
  server.instance.serverName = server.name;

  impress.setListenerError(
    server.instance,
    server.address + ':' + server.port
  );

  if (server.instance.setTimeout) {
    server.instance.keepAlive = server.keepAlive;
    server.instance.setTimeout(server.timeout, impress.serverOnTimeout);
  }

  if (!server.nagle) {
    server.instance.on('connection', impress.serverSetNoDelay);
  }
};

// Load SSL certificates
//
impress.loadCertificates = (server) => {
  if (server.key && server.cert) {
    const certDir = impress.dir + '/config/ssl/';
    return {
      key: api.fs.readFileSync(certDir + server.key),
      cert: api.fs.readFileSync(certDir + server.cert)
    };
  } else {
    impress.fatalError('Certificate is not configured for TLS');
  }
};

// Detect bind error (note: some node.js versions have error in constant name)
//
impress.serverOnError = (err) => {
  if (['EADDRINUSE', 'EACCESS', 'EACCES'].indexOf(err.code) > -1) {
    const msg = 'Can`t bind to host/port ' + err.address;
    if (process.isWorker) {
      process.send({ name: 'impress:exit', error: msg });
    } else {
      impress.fatalError(msg);
    }
  }
};

// Add error handler for certain address
//
impress.setListenerError = (listener, address) => {
  listener.on('error', (err) => {
    err.address = address;
    impress.serverOnError(err);
  });
};

// Send request timeout
//
impress.serverOnTimeout = (socket) => {
  if (socket.client && !socket.client.finished) {
    socket.client.timedOut = true;
    socket.client.error(408);
  } else socket.destroy();
};

// Disable nagle's algorithm
//
impress.serverSetNoDelay = (socket) => socket.setNoDelay();

// Fork new worker
// bind worker to serverName from config if serverName defined
//
impress.forkWorker = (workerId, serverName, inspect) => {
  const env = {
    WORKER_ID: workerId + 1,
    WORKER_TYPE: 'server'
  };
  if (serverName !== undefined) env.WORKER_SERVER_NAME = serverName;
  impress.nextWorkerId++;
  const worker = impress.fork(env, inspect);
  worker.nodeId = impress.config.scale.server + 'N' + (workerId + 1);
  impress.stat.forkCount++;
  impress.workers[workerId] = worker;
  worker.on('exit', (code /*signal*/) => {
    impress.stat.forkCount--;
    delete impress.workers[workerId];
    if (code > 0) api.timers.setImmediate(() => {
      impress.forkWorker(workerId, serverName, inspect);
    });
  });
  impress.listenWorker(worker);
};

// Kill all forked workers with SIGTERM
//
impress.killWorkers = () => {
  let workerId, worker;
  for (workerId in impress.workers) {
    worker = impress.workers[workerId];
    worker.kill();
  }
};

// Fork long worker
//   appName - application name to run worker in application context
//   workerFile - filename with path
//   clientData - JSON serialized client request data
//
impress.forkLongWorker = (appName, workerFile, clientData) => {
  if (process.isMaster) {
    const workerId = impress.nextWorkerId++;
    const env = {
      WORKER_ID: workerId,
      WORKER_TYPE: 'long',
      WORKER_FILE: workerFile,
      WORKER_APPNAME: appName,
      WORKER_CLIENT: clientData
    };
    const nodeId = impress.config.scale.server + 'L' + workerId;
    const worker = impress.fork(env);
    worker.file = workerFile;
    worker.nodeId = nodeId;
    impress.listenWorker(worker);
    impress.workers[worker.id] = worker;
    impress.longWorkers[worker.id] = worker;
    impress.stat.forkCount++;
    worker.on('exit', (/*code, signal*/) => {
      impress.retranslateEvent(-1, {
        name: 'impress:exitlongworker',
        appName,
        nodeId
      });
      impress.stat.forkCount--;
      delete impress.longWorkers[worker.id];
      delete impress.workers[worker.id];
    });
    return worker;
  } else {
    process.send({
      name: 'impress:forklongworker',
      appName,
      workerFile,
      clientData
    });
  }
};

// Kill long worker
//   appName    - application name
//   workerFile - filename with path
//   nodeId     - kill worker by id
//
impress.killLongWorker = (appName, workerFile, nodeId) => {
  if (process.isMaster) {
    let workerId, worker;
    for (workerId in impress.longWorkers) {
      worker = impress.longWorkers[workerId];
      if (
        worker.file === workerFile &&
        (!nodeId || worker.nodeId === nodeId)
      ) {
        worker.emit('exit', worker);
        worker.removeAllListeners('exit');
        impress.log.server('Kill ' + worker.pid + '/' + worker.nodeId);
        worker.kill();
        impress.stat.forkCount++;
      }
    }
  } else {
    process.send({
      name: 'impress:killlongworker',
      appName,
      workerFile
    });
  }
};

// Initialize IPC for interprocess event routing
// Master receive events from workers here
//
impress.listenWorker = (worker) => {
  worker.on('message', (message) => {
    if (message.name === 'impress:exit') {
      impress.fatalError(message.error);
    }
    if (message.name === 'impress:start') {
      impress.serversStarted++;
      if (impress.serversStarted >= impress.serversCount) {
        impress.server.emit('started');
      }
    }
    if (message.name === 'impress:forklongworker') {
      const longWorker = impress.forkLongWorker(
        message.appName,
        message.workerFile,
        message.clientData
      );
      message.pid = longWorker.pid;
      message.nodeId = longWorker.nodeId;
      impress.retranslateEvent(-1, message);
      delete message.name;
    } else if (message.name === 'impress:killlongworker') {
      impress.killLongWorker(message.appName, message.workerFile);
    }
  });
};

// Retranslate IPC event to all workers except one
//
impress.retranslateEvent = (exceptWorkerId, message) => {
  let workerId, worker;
  exceptWorkerId += '';
  for (workerId in impress.workers) {
    worker = impress.workers[workerId];
    if (workerId !== exceptWorkerId) worker.send(message);
  }
};

// Dispatch requests
//   req - request is an instance of http.IncomingMessage
//   res - rsponse is an instance of http.ServerResponse
//
impress.dispatcher = (req, res) => {
  impress.stat.requestCount++;
  const host = api.common.parseHost(req.headers.host);
  let application, appName;
  for (appName in impress.applications) {
    application = impress.applications[appName];
    if (application.config.hosts) {
      if (application && application.hostsRx) {
        if (application.hostsRx.test(host)) {
          return application.dispatch(req, res);
        }
      } else if (application.config.hosts.indexOf(host) > -1) {
        return application.dispatch(req, res);
      }
    }
  }
  // No application detected to dispatch request
  const client = new impress.Client(impress, req, res);
  client.error(404);
};
