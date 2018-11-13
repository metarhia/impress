'use strict';

// Impress Application Server Core

require('./api.registry');

global.impress = new api.events.EventEmitter();
impress.name = 'impress';
impress.isImpress = true;
impress.firstStart = true;
impress.isWorker = 'WORKER_SERVER_NAME' in process.env;
impress.isMaster = !impress.isWorker;
impress.workerId = impress.isMaster ? 0 : parseInt(process.env.WORKER_ID, 10);
impress.workerType = process.env.WORKER_TYPE;
impress.dir = process.cwd();
impress.isWin = process.platform.startsWith('win');
impress.applicationsDir = impress.dir + '/applications';
impress.moduleDir = api.path.dirname(__dirname);
impress.mode = process.env.IMPRESS_MODE || '';
impress.serverName = process.env.WORKER_SERVER_NAME;
impress.serverProto = process.env.WORKER_SERVER_PROTO;
impress.nextWorkerId = 1;
impress.applications = {};
impress.stat = { fork: 0, event: 0, req: 0, res: 0 };

['constants', 'stack', 'plugins', 'scripts', 'workers', 'files', 'templates']
  .forEach(name => require('./' + name));

impress.serverConfigDefinition = api.definition.require(
  'config.impress.definition'
);

impress.applicationConfigDefinition = api.definition.require(
  'config.application.definition'
);

// Fatal error with process termination
//   err <Error> | <string>
impress.fatalError = err => {
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

  if (msg.includes('impress.createScript')) {
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

process.on('uncaughtException', err => {
  impress.fatalError(err);
});

process.execArgv.forEach(val => {
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

// Import/export namespaces after all applications loaded
const linkNamespaces = () => {
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

const createApplications = callback => {
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

const loadApplications = callback => {
  if (impress.isMaster) {
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
  impress.createSandbox(impress, () => {
    impress.loadConfig(() => {
      if (impress.workerType === 'long') {
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
          impress.isMaster ? 'srv' : impress.nodeId
        );
      }
      impress.processMarker = (impress.isMaster ? 'Master' : 'Worker') +
        '(' + process.pid + '/' + impress.nodeId + ')';
      const cfg = impress.config.scale;
      if (!impress.isMaster || !cfg || !cfg.check) {
        impress.load();
        return;
      }
      impress.log.system('Startup check: ' + cfg.check);
      api.http.get(cfg.check, res => {
        if (res.statusCode === 404) impress.load();
        else impress.fatalError(impress.ALREADY_STARTED);
      }).on('error', impress.load);
    });
  });
};

// Establish IPC processing
const ipcStart = () => {
  process.on('SIGINT', impress.shutdown);
  process.on('SIGTERM', impress.shutdown);

  if (impress.isWorker) {
    process.on('message', message => {
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
    process.on('beforeExit', code => {
      process.send({ name: 'impress:exit', code });
      impress.log.system('Worker terminated');
    });
  }
};

// Print information about started server to stdout and logs
//   server <Object>, server instance
const logServerStarted = server => {
  let protocolName = server.protocol.toUpperCase();
  if (server.transport === 'tls') {
    protocolName += 'S';
  } else if (server.transport === 'ws' || server.transport === 'wss') {
    protocolName += '/' + server.transport.toUpperCase();
  }
  let message = protocolName + ' listen on ' + server.address + ':' +
    server.port + ' by ' + impress.processMarker;
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

const serverOnError = err => {
  if (['EADDRINUSE', 'EACCES'].includes(err.code)) {
    const msg = 'Can\'t bind to host/port ' + err.address;
    if (impress.isWorker) {
      process.send({ name: 'impress:exit', error: msg });
    } else {
      const error = new Error(msg);
      error.code = 'EBIND';
      impress.fatalError(error);
    }
  }
};

// Send request timeout
const serverOnTimeout = socket => {
  if (!socket.client || socket.client.finished) {
    socket.destroy();
    return;
  }
  socket.client.timedOut = true;
  socket.client.error(408);
};

const configureServer = server => {
  server.instance.serverName = server.name;

  server.instance.on('error', err => {
    err.address = server.address + ':' + server.port;
    serverOnError(err);
  });

  if (server.instance.setTimeout) {
    server.instance.keepAlive = server.keepAlive;
    server.instance.setTimeout(server.timeout, serverOnTimeout);
  }

  if (!server.nagle) {
    server.instance.on('connection', socket => {
      socket.setNoDelay();
    });
  }
};

const startServer = server => {
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

// Start JSTP and HTTP servers
const startServers = () => {
  const servers = impress.config.servers;
  const serverNames = Object.keys(servers);

  impress.serversCount = serverNames.length;
  impress.serversStarted = 1;

  let workerId = 0;

  serverNames.forEach(serverName => {
    const server = servers[serverName];
    server.name = serverName;

    if (impress.isMaster) {
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
    if (impress.isMaster) {
      impress.log.system('Server started');
    } else {
      process.send({ name: 'impress:start', id: impress.workerId });
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
    Object.keys(impress.config.servers).forEach(key => {
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

// Unload configuration and stop server
impress.stop = () => {
  const servers = impress.config.servers;
  impress.cache.clear();
  if (!servers) {
    impress.log.warn('No servers active');
    return;
  }
  const keys = Object.keys(servers);
  keys.forEach(serverName => {
    const server = servers[serverName];
    if (server.instance) {
      server.instance.close(() => {
        for (const appName in impress.applications) {
          const application = impress.applications[appName];
          application.emit('stop');
          application.stopTasks();
          application.cache.clear();
        }
      });
    }
  });
};

impress.shutdown = (code = 0) => {
  if (impress.finalization) return;
  impress.finalization = true;
  if (impress.isMaster) {
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

// Load SSL certificates
//   server - <Object> server configuration
impress.loadCertificates = server => {
  if (server.key && server.cert) {
    const certDir = impress.dir + '/config/ssl/';
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

// Retranslate IPC event to all workers except one
//   exceptWorkerId <number>
//   message <string> message to retranslate
impress.retranslateEvent = (exceptWorkerId, message) => {
  exceptWorkerId += '';
  for (const workerId in impress.workers) {
    const worker = impress.workers[workerId];
    if (worker.channel && workerId !== exceptWorkerId) {
      worker.send(message);
    }
  }
};

// HTTP Dispatcher
//   req <IncomingMessage>
//   res <ServerResponse>
// Rerurns: <Client>
impress.dispatcher = (req, res) => {
  impress.stat.req++;
  const host = api.common.parseHost(req.headers.host);
  for (const appName in impress.applications) {
    const application = impress.applications[appName];
    const appFound = application.config.hosts &&
      ((application.hostsRx && application.hostsRx.test(host)) ||
      application.config.hosts.includes(host));
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

// Log API Method
//   fnPath <string> path to function to be wrapped
// Example: impress.logApiMethod('fs.stats')
impress.logApiMethod = fnPath => {
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
