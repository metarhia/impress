'use strict';

// Impress Application Server Core

process.isWorker = 'WORKER_SERVER_NAME' in process.env;
process.isMaster = !process.isWorker;
process.workerId = process.isMaster ? 0 : parseInt(process.env.WORKER_ID, 10);
process.workerType = process.env.WORKER_TYPE;
process.dir = process.cwd();
process.isWin = process.platform.startsWith('win');

require('./api.registry');
api.registry.load();

global.impress = new api.events.EventEmitter();
require('./constants');

impress.name = 'impress';
impress.isImpress = true;
impress.firstStart = true;
impress.dir = process.dir;
impress.applicationsDir = process.dir + '/applications';
impress.moduleDir = api.path.dirname(__dirname);
impress.mode = process.env.IMPRESS_MODE || '';
impress.serverName = process.env.WORKER_SERVER_NAME;
impress.serverProto = process.env.WORKER_SERVER_PROTO;
impress.nextWorkerId = 1;
impress.applications = {};

impress.stat = { fork: 0, event: 0, req: 0, res: 0 };

require('./stack');
require('./plugins');

impress.fork = (
  // Fork Impress process
  env, // environment
  inspect // boolean, inspect node.js process
) => {
  const modulePath = process.argv[1];
  const args = process.argv.slice(2);
  const argv = process.execArgv.slice(0);
  if (inspect) {
    argv.push('--inspect=' + inspect);
  }
  const opt = {
    env: Object.assign(process.env, env),
    execArgv: argv
  };
  return api.cp.fork(modulePath, args, opt);
};

impress.serverConfigDefinition = api.definition.require(
  'config.impress.definition'
);

impress.applicationConfigDefinition = api.definition.require(
  'config.application.definition'
);

impress.fatalError = (
  // Fatal error with process termination
  err // instance of Error or string
) => {
  if (!err.stack) err = new Error(err);
  const appName = impress.findApplicationByStack(err);

  let msg;
  if (err.code === 'EBIND') {
    msg = err.message;
  } else {
    msg = impress.shortenStack(err.stack);
  }

  if (!impress.log.error) {
    console.error(msg);
    return;
  }
  impress.log.error(msg);

  if (msg.includes('application.createScript')) {
    impress.log.system(
      'Recover worker after throw Error in application: ' + appName
    );
  } else {
    impress.log.system('Crashed');
    impress.log.on('close', () => {
      impress.shutdown(1);
    });
    impress.log.close();
  }
};

process.on('uncaughtException', (err) => {
  impress.fatalError(err);
});

process.execArgv.forEach((val) => {
  if (val.startsWith('--max_old_space_size')) {
    const sp = val.split('=');
    if (sp[1]) {
      impress.memoryLimit = parseInt(sp[1], 10) * impress.MEMORY_LIMIT;
    }
  }
});

// If memory limit detected we can check it periodically (5s by default)
// to prevent process exit or hang

if (impress.memoryLimit) {
  api.timers.setInterval(() => {
    let mu = process.memoryUsage();
    if (mu.heapTotal < impress.memoryLimit) return;
    impress.cache.clear();
    for (const appName in impress.applications) {
      const application = impress.applications[appName];
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
  }, impress.MEMORY_LIMIT_CHECK_INTERVAL);
}

const compareMasks = (m1, m2) => m1 === m2 || m1 === '*' || m2 === '*';

const compareHosts = () => {
  const cmp = [];
  for (const appName in impress.applications) {
    const config = impress.applications[appName].config;
    if (!config) continue;
    const hosts = config.hosts;
    if (!hosts) continue;
    for (let i = 0; i < hosts.length; i++) {
      let hostFound = false;
      for (let j = 0; j < cmp.length; j++) {
        hostFound = hostFound || hosts[i] === cmp[j];
        if (compareMasks(hosts[i], cmp[j])) {
          impress.log.warn(
            'Hosts mask overlapping: "' + hosts[i] +
            '" and "' + cmp[j] + '"'
          );
        }
      }
      if (!hostFound) cmp.push(hosts[i]);
    }
  }
};

const linkNamespaces = (
  // Import/export namespaces after all applications loaded
) => {
  for (const appName in impress.applications) {
    const application = impress.applications[appName];
    const imp = api.common.getByPath(application, 'config.sandbox.import');
    if (!imp) continue;
    for (const impAppName in imp) {
      const impHash = imp[impAppName];
      const impApp = impress.applications[impAppName];
      const exp = api.common.getByPath(impApp, 'config.sandbox.export');
      if (impApp && impHash && exp) {
        for (const expObjName in impHash) {
          const impObjName = impHash[expObjName];
          const impObj = api.common.getByPath(impApp.sandbox, expObjName);
          if (exp.includes(expObjName)) {
            api.common.setByPath(application.sandbox, impObjName, impObj);
          } else {
            impress.log.warn(
              'Application ' + appName + ' imports namespace ' + expObjName +
              ' from ' + impAppName +
              ' as ' + impObjName + ' but it is not exported'
            );
          }
        }
      }
    }
  }
};

const createApplications = (callback) => {
  api.metasync.each(impress.workerApplications, (appName, cb) => {
    const dir = impress.applicationsDir + '/' + appName;
    api.fs.stat(dir, (err, stats) => {
      if (err || !stats.isDirectory()) {
        cb();
        return;
      }
      const application = new api.events.EventEmitter();
      application.name = appName;
      application.dir = dir;
      impress.mixinPlugins(application);
      impress.applications[application.name] = application;
      application.createApplication(cb);
    });
  }, () => {
    if (impress.serverProto === 'http') compareHosts();
    linkNamespaces();
    callback();
  });
};

const loadApplications = (callback) => {
  if (process.isMaster) {
    callback();
    return;
  }
  if (impress.workerApplications) {
    createApplications(callback);
    return;
  }
  const server = impress.config.servers[impress.serverName];
  if (server && server.applications) {
    impress.workerApplications = server.applications;
    createApplications(callback);
  } else {
    api.fs.readdir(impress.applicationsDir, (err, apps) => {
      if (err) {
        impress.fatalError(impress.CANT_READ_DIR + impress.applicationsDir);
        callback();
      } else {
        impress.workerApplications = apps;
        createApplications(callback);
      }
    });
  }
};

impress.start = () => {
  impress.loadPlugins();
  impress.createSandbox(() => {
    impress.loadConfig(() => {
      if (process.workerType === 'long') {
        process.title = 'impress ' + impress.nodeId;
        impress.workerApplications = [process.env.WORKER_APPNAME];
        impress.workerApplicationName = process.env.WORKER_APPNAME;
        impress.workerApplicationFile = process.env.WORKER_FILE;
        const client = api.json.parse(process.env.WORKER_CLIENT);
        impress.workerApplicationClient = client;
        client.runScript = impress.Client.prototype.runScript;
        client.executeFunction = impress.Client.prototype.executeFunction;
      } else {
        process.title = 'impress ' + (
          process.isMaster ? 'srv' : impress.nodeId
        );
      }
      impress.processMarker = (
        (process.isMaster ? 'Master' : 'Worker') +
        '(' + process.pid + '/' + impress.nodeId + ')'
      );
      const cfg = impress.config.scale;
      if (!process.isMaster || !cfg || !cfg.check) {
        impress.load();
        return;
      }
      impress.log.system('Startup check: ' + cfg.check);
      api.http.get(cfg.check, (res) => {
        if (res.statusCode === 404) impress.load();
        else impress.fatalError(impress.ALREADY_STARTED);
      }).on('error', impress.load);
    });
  });
};

const ipcStart = (
  // Establish IPC processing
) => {
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
      impress.log.system('Worker terminated');
    });
  }
};

const logServerStarted = (
  // Print information about started server to stdout and logs
  server // server instance
) => {
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
  if (!server.instance) message += ' FAILED';
  impress.log.system(message);
};

const serverOnError = (err) => {
  if (['EADDRINUSE', 'EACCES'].includes(err.code)) {
    const msg = 'Can\'t bind to host/port ' + err.address;
    if (process.isWorker) {
      process.send({ name: 'impress:exit', error: msg });
    } else {
      const error = new Error(msg);
      error.code = 'EBIND';
      impress.fatalError(error);
    }
  }
};

const serverOnTimeout = (
  // Send request timeout
  socket
) => {
  if (!socket.client || socket.client.finished) {
    socket.destroy();
    return;
  }
  socket.client.timedOut = true;
  socket.client.error(408);
};

const configureServer = (server) => {
  server.instance.serverName = server.name;

  server.instance.on('error', (err) => {
    err.address = server.address + ':' + server.port;
    serverOnError(err);
  });

  if (server.instance.setTimeout) {
    server.instance.keepAlive = server.keepAlive;
    server.instance.setTimeout(server.timeout, serverOnTimeout);
  }

  if (!server.nagle) {
    server.instance.on('connection', (socket) => {
      socket.setNoDelay();
    });
  }
};

const startServer = (
  server // server configuration
) => {
  if (server.protocol === 'jstp') {
    server.instance = impress.jstp.createServer(server);
  } else if (server.protocol === 'http') {
    if (server.transport === 'tls') {
      const cert = impress.loadCertificates(server);
      if (cert) {
        server.instance = api.https.createServer(cert, impress.dispatcher);
      }
    } else {
      server.instance = api.http.createServer(impress.dispatcher);
    }
    if (server.instance) {
      impress.websocket.upgradeServer(server.instance);
    }
  }

  logServerStarted(server);
  if (!server.instance) return;
  configureServer(server);

  if (server.address === '*') {
    server.instance.listen(server.port);
  } else {
    server.instance.listen(server.port, server.address);
  }
};

const startServers = (
  // Start JSTP and HTTP servers
) => {
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
        startServer(server);
      } else if (impress.firstStart) {
        impress.forkWorker(workerId++, server);
      }
    } else if (serverName === impress.serverName) {
      startServer(server);
    }
  });
};

impress.load = () => {
  ipcStart();
  loadApplications(() => {
    if (process.isMaster) {
      impress.log.system('Server started');
    } else {
      process.send({ name: 'impress:start', id: process.workerId });
      impress.log.system('Worker forked');
    }
    if (impress.workerApplicationName) {
      const application = impress.applications[impress.workerApplicationName];
      impress.workerApplicationClient.application = application;
      impress.workerApplicationClient.access = { allowed: true };
      impress.workerApplicationClient.runScript(
        'worker', impress.workerApplicationFile,
        () => {
          impress.log.on('close', () => {
            process.exit(0);
          });
          impress.log.close();
        }
      );
    }
    Object.keys(impress.config.servers).forEach((key)  => {
      const server = impress.config.servers[key];
      if (server.protocol === 'jstp' && server.instance) {
        server.instance.updateApplications(impress.jstp.prepareApplications());
      }
    });
  });
  if (!impress.workerApplicationName) {
    startServers();
    api.health.init();
    api.cloud.init();
  }
  // Set garbage collection interval
  if (typeof global.gc === 'function' && impress.config.scale.gc > 0) {
    api.timers.setInterval(global.gc, impress.config.scale.gc);
  }
  impress.firstStart = false;
};

impress.stop = (
  // Unload configuration and stop server
) => {
  const servers = impress.config.servers;
  impress.cache.clear();
  if (!servers) {
    impress.log.warn('No servers active');
    return;
  }
  const keys = Object.keys(servers);
  keys.forEach((serverName) => {
    const server = servers[serverName];
    if (server.instance) server.instance.close(() => {
      for (const appName in impress.applications) {
        const application = impress.applications[appName];
        application.emit('stop');
        application.stopTasks();
        application.cache.clear();
      }
    });
  });
};

impress.shutdown = (code = 0) => {
  if (impress.finalization) return;
  impress.finalization = true;
  if (process.isMaster) {
    impress.killWorkers();
    impress.log.system('Stopped server');
    impress.log.on('close', () => {
      api.timers.setImmediate(() => {
        impress.stop();
        process.exit(code);
      });
    });
  } else {
    impress.log.system('Worker terminated');
    impress.log.on('close', () => {
      process.exit(code);
    });
  }
  impress.log.close();
};

impress.loadCertificates = (
  // Load SSL certificates
  server // server configuration
) => {
  if (server.key && server.cert) {
    const certDir = process.dir + '/config/ssl/';
    try {
      const key = api.fs.readFileSync(certDir + server.key);
      const cert = api.fs.readFileSync(certDir + server.cert);
      return { key, cert };
    } catch (e) {
      impress.log.error('Certificate is not found');
    }
  } else {
    impress.log.error('Certificate is not configured for TLS');
  }
};

impress.forkWorker = (
  // Fork new worker
  workerId, // number
  server, // server config
  inspect // boolean, inspect node.js process
) => {
  const env = {
    WORKER_ID: workerId + 1,
    WORKER_TYPE: 'server',
    WORKER_SERVER_NAME: server.name,
    WORKER_SERVER_PROTO: server.protocol
  };
  impress.nextWorkerId++;
  const worker = impress.fork(env, inspect);
  worker.workerId = workerId;
  worker.nodeId = impress.config.scale.server + 'N' + (workerId + 1);
  impress.stat.fork++;
  impress.workers[workerId] = worker;
  worker.on('exit', (code) => {
    impress.stat.fork--;
    delete impress.workers[workerId];
    if (code > 0) api.timers.setImmediate(() => {
      impress.forkWorker(workerId, server, inspect);
    });
  });
  impress.listenWorker(worker);
};

impress.killWorkers = (
  // Kill all forked workers with SIGTERM
) => {
  for (const workerId in impress.workers) {
    const worker = impress.workers[workerId];
    worker.kill();
    delete impress.workers[workerId];
  }
};

impress.forkLongWorker = (
  appName, // application name to run worker in application context
  workerFile, // filename with path
  clientData // JSON serialized client request data
) => {
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
    worker.workerId = workerId;
    worker.file = workerFile;
    worker.nodeId = nodeId;
    impress.listenWorker(worker);
    impress.workers[workerId] = worker;
    impress.longWorkers[workerId] = worker;
    impress.stat.fork++;
    worker.on('exit', (/*code, signal*/) => {
      impress.retranslateEvent(-1, {
        name: 'impress:exitlongworker',
        appName, nodeId
      });
      impress.stat.fork--;
      delete impress.longWorkers[workerId];
      delete impress.workers[workerId];
    });
    return worker;
  } else {
    process.send({
      name: 'impress:forklongworker',
      appName, workerFile, clientData
    });
  }
};

impress.killLongWorker = (
  appName, // application name
  workerFile, // filename with path
  nodeId // kill worker by id
) => {
  if (process.isMaster) {
    for (const workerId in impress.longWorkers) {
      const worker = impress.longWorkers[workerId];
      if (
        worker.file === workerFile &&
        (!nodeId || worker.nodeId === nodeId)
      ) {
        worker.emit('exit', worker);
        worker.removeAllListeners('exit');
        impress.log.system('Kill ' + worker.pid + '/' + worker.nodeId);
        worker.kill();
        delete impress.workers[workerId];
        delete impress.longWorkers[workerId];
        impress.stat.fork++;
      }
    }
  } else {
    process.send({
      name: 'impress:killlongworker', appName, workerFile
    });
  }
};

impress.listenWorker = (
  // Initialize IPC from workers to master
  worker // worker instance
) => {
  worker.on('message', (message) => {
    if (message.name === 'impress:exit') {
      impress.fatalError(message.error);
    }
    if (message.name === 'impress:start') {
      impress.serversStarted++;
      if (impress.serversStarted >= impress.serversCount) {
        impress.emit('started');
      }
    } else if (message.name === 'impress:forklongworker') {
      const longWorker = impress.forkLongWorker(
        message.appName, message.workerFile, message.clientData
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

impress.retranslateEvent = (
  // Retranslate IPC event to all workers except one
  exceptWorkerId, // number
  message // message to retranslate
) => {
  exceptWorkerId += '';
  for (const workerId in impress.workers) {
    const worker = impress.workers[workerId];
    if (worker.channel && workerId !== exceptWorkerId) {
      worker.send(message);
    }
  }
};

impress.dispatcher = (
  req, // instance of http.IncomingMessage
  res // instance of http.ServerResponse
) => {
  impress.stat.req++;
  const host = api.common.parseHost(req.headers.host);
  for (const appName in impress.applications) {
    const application = impress.applications[appName];
    const appFound = (application.config.hosts && (
      (application.hostsRx && application.hostsRx.test(host)) ||
      (application.config.hosts.includes(host))
    ));
    if (appFound) {
      if (application.ready) {
        const client = application.dispatch(req, res);
        return client;
      } else {
        const client = new impress.Client(impress, req, res);
        client.error(503);
        return client;
      }
    }
  }
  // No application detected to dispatch request
  const client = new impress.Client(impress, req, res);
  client.error(404);
  return client;
};

impress.logApiMethod = (
  fnPath // path to function to be wrapped
  // Example: impress.logApiMethod('fs.stats')
) => {
  const originalMethod = api.common.getByPath(api, fnPath);
  api.common.setByPath(api, fnPath, (...args) => {
    let callback = null;
    if (args.length > 0) {
      callback = args[args.length - 1];
      if (typeof callback === 'function') args.pop();
      else callback = null;
    }
    const logArgs = api.json.stringify(args);
    if (impress && impress.log) {
      const par = logArgs.substring(1, logArgs.length - 1);
      const msg = fnPath + '(' + par + ', callback)';
      impress.log.debug(msg);
      const stack = new Error().stack.split('\n');
      impress.log.system(stack[2].trim());
    }
    if (callback) {
      args.push((...args) => {
        const logArgs = api.json.stringify(args);
        if (impress && impress.log) {
          const par = logArgs.substring(1, logArgs.length - 1);
          const msg = fnPath + ' callback(' + par + ')';
          impress.log.debug(msg);
        }
        callback(...args);
      });
    }
    originalMethod(...args);
  });
};
