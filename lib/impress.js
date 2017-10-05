'use strict';

// Impress Application Server Core

process.isWorker = 'WORKER_SERVER_NAME' in process.env;
process.isMaster = !process.isWorker;
process.workerId = process.isMaster ? 0 : parseInt(process.env.WORKER_ID, 10);
process.workerType = process.env.WORKER_TYPE;
process.dir = process.cwd();
process.isWin = process.platform.startsWith('win');

const MEMORY_LIMIT = 900000;
const MEMORY_LIMIT_CHECK_INTERVAL = 5000;
const ALREADY_STARTED = 'Status: server is already started';
const PATH_SEPARATOR = process.isWin ? '\\' : '/';

const CORE_PLUGINS = [
  'log', 'cache', 'application', 'client',
  'index', 'files', 'templating', 'preprocess',
  'security', 'state', 'cloud', 'jstp',
  'sse', 'websocket', 'health', 'firewall'
];

require('./api.registry');
api.registry.load();

global.impress = new api.events.EventEmitter();
require('./impress.constants');
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
impress.server = new api.events.EventEmitter();

impress.stat = { fork: 0, event: 0, req: 0, res: 0 };

// Preparing stack trace transformations
const STACK_REGEXP = [
  [process.dir + PATH_SEPARATOR + 'node_modules', ''],
  [process.dir + PATH_SEPARATOR + 'lib', ''],
  [process.dir, ''],
  [/\n\s{4,}at/g, ';'],
  [/\n/g, ';'],
  [/[\t^]/g, ' '],
  [/\s{2,}/g, ' '],
  [/;\s;/g, ';']
];

// Escape STACK_REGEXP
STACK_REGEXP.forEach((item) => {
  if (typeof(item[0]) === 'string') {
    item[0] = api.common.newEscapedRegExp(item[0]);
  }
});

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

impress.normalizeStack = (stack) => {
  STACK_REGEXP.forEach((rx) => {
    stack = stack.replace(rx[0], rx[1]);
  });
  return stack;
};

impress.findApplicationByStack = (err) => {
  let appName, path;
  for (appName in impress.applications) {
    path = '/applications/' + appName;
    if (err.stack.includes(path)) return appName;
  }
};

impress.fatalError = (
  // Fatal error with process termination
  err // instance of Error or string
) => {
  const appName = impress.findApplicationByStack(err);

  let msg;
  if (err.code === 'EBIND') {
    msg = err.message;
  } else {
    msg = impress.normalizeStack(err.stack);
  }

  if (impress.log && impress.log.active) {
    impress.log.error(msg);
  } else {
    const fail = api.concolor('b,red');
    console.log(fail(msg));
  }

  if (msg.includes('application.createScript')) {
    console.log('Recover worker after throw Error in application: ' + appName);
  } else if (impress.log && impress.log.active) {
    impress.log.server('Crashed');
    impress.log.close(() => {
      impress.shutdown(1);
    });
  } else {
    impress.shutdown(1);
  }
};

/*process.on('uncaughtException', (err) => {
  impress.fatalError(err);
});*/

process.execArgv.forEach((val) => {
  if (val.startsWith('--max_old_space_size')) {
    const sp = val.split('=');
    if (sp[1]) {
      impress.memoryLimit = parseInt(sp[1], 10) * MEMORY_LIMIT;
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
  }, MEMORY_LIMIT_CHECK_INTERVAL);
}

impress.loadPlugins = () => {
  let i, len, plugin, pluginName, pluginPath;
  for (i = 0, len = CORE_PLUGINS.length; i < len; i++) {
    pluginName = CORE_PLUGINS[i];
    pluginPath = './impress.' + pluginName + '.js';
    impress[pluginName] = {};
    require(pluginPath);
    plugin = impress[pluginName];
    if (plugin.mixImpress) plugin.mixin(impress);
  }
};

impress.mixinPlugins = (application) => {
  let i, len, plugin, pluginName;
  for (i = 0, len = CORE_PLUGINS.length; i < len; i++) {
    pluginName = CORE_PLUGINS[i];
    plugin = impress[pluginName];
    application[pluginName] = {};
    if (plugin.mixin) plugin.mixin(application);
  }
};

impress.compareMasks = (m1, m2) => (
  m1 === m2 || m1 === '*' || m2 === '*'
);

impress.compareHosts = () => {
  const cmp = [];
  let i, j, ilen, jlen, appName, config, hosts, hostFound;
  for (appName in impress.applications) {
    config = impress.applications[appName].config;
    if (!config) continue;
    hosts = config.hosts;
    if (!hosts) continue;
    for (i = 0, ilen = hosts.length; i < ilen; i++) {
      hostFound = false;
      for (j = 0, jlen = cmp.length; j < jlen; j++) {
        hostFound = hostFound || hosts[i] === cmp[j];
        if (impress.compareMasks(hosts[i], cmp[j])) {
          impress.log.warning(
            'Hosts mask overlapping: "' + hosts[i] +
            '" and "' + cmp[j] + '"'
          );
        }
      }
      if (!hostFound) cmp.push(hosts[i]);
    }
  }
};

impress.loadApplications = (callback) => {
  if (process.isMaster) {
    callback();
    return;
  }
  if (impress.workerApplications) {
    impress.createApplications(callback);
    return;
  }
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
};

impress.createApplications = (callback) => {
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
    if (impress.serverProto === 'http') impress.compareHosts();
    impress.linkNamespaces();
    callback();
  });
};

impress.linkNamespaces = (
  // Import/export namespaces after all applications loaded
) => {
  let appName, application, exp, imp, impHash,
      impAppName, impApp, impObjName, expObjName, impObj;
  for (appName in impress.applications) {
    application = impress.applications[appName];
    imp = api.common.getByPath(application, 'config.sandbox.import');
    if (!imp) continue;
    for (impAppName in imp) {
      impHash = imp[impAppName];
      impApp = impress.applications[impAppName];
      exp = api.common.getByPath(impApp, 'config.sandbox.export');
      if (impApp && impHash && exp) {
        for (expObjName in impHash) {
          impObjName = impHash[expObjName];
          impObj = api.common.getByPath(impApp.sandbox, expObjName);
          if (exp.includes(expObjName)) {
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
};

impress.server.start = () => {
  impress.loadPlugins();
  if (process.isMaster) {
    console.log(
      api.concolor('b,white')('Impress Application Server') +
      api.concolor('white')(' starting, reading configuration')
    );
  }
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
        impress.server.load();
        return;
      }
      console.log('Startup check: ' + cfg.check);
      api.http.get(cfg.check, (res) => {
        if (res.statusCode === 404) impress.server.load();
        else impress.fatalError(ALREADY_STARTED);
      }).on('error', impress.server.load);
    });
  });
};

impress.server.load = () => {
  impress.ipc();
  impress.loadApplications(() => {
    if (process.isMaster) {
      impress.log.server('Started server');
    } else {
      process.send({ name: 'impress:start', id: process.workerId });
      impress.log.server('Forked worker');
    }
    if (impress.workerApplicationName) {
      const application = impress.applications[impress.workerApplicationName];
      impress.workerApplicationClient.application = application;
      impress.workerApplicationClient.access = { allowed: true };
      impress.workerApplicationClient.runScript(
        'worker', impress.workerApplicationFile,
        () => {
          impress.log.close(() => {
            process.exit(0);
          });
        }
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

impress.ipc = (
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
      impress.log.server('Terminated worker');
    });
  }
};

impress.server.stop = (
  // Unload configuration and stop server
) => {
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

impress.shutdown = (code = 0) => {
  if (impress.finalization) return;
  impress.finalization = true;
  if (process.isMaster) {
    impress.killWorkers();
    impress.log.server('Stopped server');
    console.log('Impress shutting down');
    impress.log.close(() => {
      api.timers.setImmediate(() => {
        impress.server.stop();
        process.exit(code);
      });
    });
  } else {
    impress.log.server('Terminated worker');
    impress.log.close(() => {
      process.exit(code);
    });
  }
};

impress.startServers = (
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
        impress.startServer(server);
      } else if (impress.firstStart) {
        impress.forkWorker(workerId++, server);
      }
    } else if (serverName === impress.serverName) {
      impress.startServer(server);
    }
  });
};

impress.startServer = (
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

  impress.logServerStarted(server);
  if (!server.instance) return;
  impress.configureServer(server);

  if (server.address === '*') {
    server.instance.listen(server.port);
  } else {
    server.instance.listen(server.port, server.address);
  }
};

impress.logServerStarted = (
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
  console.log('  ' + message);
  impress.log.server(message);
};

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

impress.serverOnError = (err) => {
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

impress.setListenerError = (listener, address) => {
  listener.on('error', (err) => {
    err.address = address;
    impress.serverOnError(err);
  });
};

impress.serverOnTimeout = (
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

impress.serverSetNoDelay = (
  // Disable nagle's algorithm
  socket
) => {
  socket.setNoDelay();
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
  worker.on('exit', (code /*signal*/) => {
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
  let workerId, worker;
  for (workerId in impress.workers) {
    worker = impress.workers[workerId];
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

//
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
        impress.server.emit('started');
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
  let workerId, worker;
  exceptWorkerId += '';
  for (workerId in impress.workers) {
    worker = impress.workers[workerId];
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
  let application, appName, appFound;
  for (appName in impress.applications) {
    application = impress.applications[appName];
    appFound = (application.config.hosts && (
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
      if (typeof(callback) === 'function') args.pop();
      else callback = null;
    }
    const logArgs = api.json.stringify(args);
    if (impress && impress.log) {
      const par = logArgs.substring(1, logArgs.length - 1);
      const msg = fnPath + '(' + par + ', callback)';
      impress.log.debug(msg);
      const stack = new Error().stack.split('\n');
      impress.log.server(stack[2].trim());
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
