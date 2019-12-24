'use strict';

// Impress Application Server Core

process.title = 'impress';

global.api = {};
global.impress = {};
global.registry = require('./registry');
global.events = new api.events.EventEmitter();

impress.name = 'impress';
impress.initialized = false;
impress.applicationName = process.env.WORKER_APP || '';
impress.mode = process.env.SERVER_MODE || '';
impress.isMaster = !impress.applicationName;
impress.isWorker = !impress.isMaster;
impress.workerId = impress.isMaster ? 0 : parseInt(process.env.WORKER_ID, 10);
impress.dir = process.cwd();
impress.applicationsDir = api.path.join(impress.dir, 'applications');
impress.serverProto = process.env.SERVER_PROTO;
impress.serverPort = process.env.SERVER_PORT;
impress.nodeId = process.env.WORKER_NODE;
impress.nextWorkerId = 1;
impress.workers = new Map();
impress.server = null;
impress.application = null;

impress.DEFAULT_KEEP_ALIVE = api.common.duration('5s');
impress.DEFAULT_TIMEOUT = api.common.duration('30s');
impress.DEFAULT_SHUTDOWN = api.common.duration('5s');
impress.TEST_TIMEOUT = api.common.duration('5m');

{
  const submodules = [
    'constants', 'stack', 'application', 'scripts', 'workers',
    'files', 'templates', 'extensions', 'client',
  ];

  for (const submodule of submodules) {
    require('./' + submodule);
  }
}

// Fatal error with process termination
//   err <Error> | <string>
impress.fatalError = err => {
  if (!err.stack) err = new Error(err);
  const appName = 'impress'; // TODO impress.application.name;

  let msg;
  if (err.code === 'EBIND') {
    msg = err.message;
  } else {
    msg = impress.shortenStack(err.stack);
  }

  if (!impress.log) {
    console.error(msg);
    impress.shutdown(1);
  }
  impress.log.error(msg);

  if (msg.includes('impress.createScript')) {
    const msg = 'Recover worker after throw Error in application: ';
    impress.log.system(msg + appName);
  } else {
    impress.log.system('Crashed');
    impress.shutdown(1);
  }
};

// Log exception
//   err <Error>
impress.logException = err => {
  const stack = impress.shortenStack(err.stack);
  if (impress.log) impress.log.error(stack);
  else console.error(stack);
};

impress.accessLog = client => {
  const endTime = Date.now();
  const { application, ip, socket, req, res, session } = client;
  const { bytesRead, bytesWritten } = socket;
  const { method, url, headers } = req;
  const code = res.statusCode;
  const elapsed = endTime - client.startTime;
  const time = elapsed.toString() + 'ms';
  const login = session ? session.login : '-';
  const token = session ? session.token : '-';
  const agent = headers['user-agent'] || '-';
  const referer = headers['referer'] || '-';
  const msg = `${time} ${ip} ${login} ${token} ${bytesRead} ` +
    `${bytesWritten} ${method} ${code} ${url} ${agent} ${referer}`;
  application.log.access(msg);
  if (elapsed >= client.slowTime) application.log.slow(msg);
};

process.on('uncaughtException', impress.fatalError);

process.on('warning', warning => {
  const stack = impress.shortenStack(warning.stack);
  const message = `${warning.message} ${stack}`;
  if (impress.log) {
    impress.log.warn(message);
  } else {
    console.warn(message);
  }
});

process.on('multipleResolves', (type, promise, repeated) => {
  const msg = `multipleResolves type: ${type}`;
  const sp = impress.shortenStack(api.util.inspect(promise));
  const sr = impress.shortenStack(api.util.inspect(repeated));
  impress.log.warn(`${msg}, first: ${sp}, repeated: ${sr}`);
});

process.on('unhandledRejection', reason => {
  const stack = impress.shortenStack(reason.stack);
  impress.log.warn(`unhandledRejection reason: ${stack}`);
});

process.on('rejectionHandled', promise => {
  const s = impress.shortenStack(api.util.inspect(promise));
  impress.log.warn(`rejectionHandled promise: ${s}`);
});

for (const arg of process.execArgv) {
  if (arg.startsWith('--max_old_space_size')) {
    const sp = arg.split('=');
    const limit = sp[1];
    if (limit) {
      impress.memoryLimit = parseInt(limit, 10) * impress.MEMORY_LIMIT;
    }
  }
}

// If memory limit detected we can check it periodically (5s by default)
// to prevent process exit or hang

if (impress.memoryLimit) {
  setInterval(() => {
    const before = process.memoryUsage();
    if (before.heapTotal < impress.memoryLimit) return;
    impress.cache.clear();
    if (impress.application) {
      impress.application.cache.clear();
    }
    const after = process.memoryUsage();
    if (after.heapTotal > impress.memoryLimit) {
      const mem = api.common.bytesToSize(after.heapTotal);
      impress.fatalError(`Memory limit exceeded: ${mem}, restarting`);
    }
  }, impress.MEMORY_LIMIT_CHECK_INTERVAL);
}

const loadApplication = async () => {
  if (impress.isMaster) return;
  if (!impress.workerApplicationName) {
    impress.workerApplicationName = 'example';
  }
  if (impress.workerApplicationName) {
    const name = impress.workerApplicationName;
    const dir = api.path.join(impress.applicationsDir, name);
    await api.fs.promises.access(dir);
    const application = new impress.Application(name, dir);
    impress.application = application;
    await api.events.once(application, 'started');
    return;
  }
};

/*
  const config = impress.config.sections.servers[impress.serverName];
  try {
    const apps = await api.fs.promises.readdir(impress.applicationsDir);
    impress.workerApplications = apps;
    await createApplication();
  } catch (err) {
    impress.fatalError(impress.CANT_READ_DIR + impress.applicationsDir);
  }
*/

impress.initLogger = () => {
  const logDir = api.path.join(impress.dir, 'log');
  const config = impress.config.sections.log;
  const { writeInterval, writeBuffer, keepDays, toStdout, toFile } = config;
  api.mkdirp.sync(logDir);
  impress.logger = api.metalog({
    path: logDir, node: impress.nodeId,
    writeInterval, writeBuffer, keepDays,
    toStdout, toFile
  });
  impress.log = impress.logger.bind('impress');
};

/*const preload = () => {
  process.title = 'impress ' + (impress.isMaster ? 'srv' : impress.nodeId);
  const procType = impress.isMaster ? 'Master' : 'Worker';
  impress.processMarker = `${procType}(${process.pid}/${impress.nodeId})`;
  impress.load();
};*/

impress.start = async () => {
  const sandbox = { Duration: api.common.duration };
  api.vm.createContext(sandbox);
  const options = { sandbox, mode: impress.mode };
  const configDir = api.path.join(impress.dir, 'config');
  impress.config = await new api.Config(configDir, options);
  if (impress.isMaster) {
    const serverId = impress.config.sections.scale.server;
    impress.serverId = serverId;
    impress.nodeId = serverId + 'N' + impress.workerId;
  }
  //impress.initLogger();
  //impress.logger.once('open', () => {
  //  preload();
  //});
};

// Establish IPC processing
const ipcStart = () => {
  process.on('SIGTERM', impress.shutdown);
  if (impress.isMaster) {
    process.on('SIGINT', impress.shutdown);
    process.on('SIGHUP', impress.shutdown);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.on('data', (data) => {
        const key = data[0];
        if (key === 3) {
          impress.shutdown();
        }
      });
    }
  } else {
    process.on('message', message => {
      impress.log.system('Message received: ' + message);
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
  const { name, protocol, transport, address, port } = server.config;
  let protocolName = protocol.toUpperCase();
  if (transport === 'tls') {
    protocolName += 'S';
  } else if (transport === 'ws' || transport === 'wss') {
    protocolName += '/' + transport.toUpperCase();
  }
  const marker = impress.processMarker;
  let message = `${protocolName} listen on ${address}:${port} by ${marker}`;
  if (name === 'master') {
    const instanceType = impress.config.sections.scale.instance;
    if (instanceType === 'controller') {
      message += ' Cloud Controller';
    } else {
      message += ' Master Server';
    }
  }
  if (!server.instance) message += ' FAILED';
  impress.log.system(message);
};

const serverOnError = (err, address) => {
  if (['EADDRINUSE', 'EACCES'].includes(err.code)) {
    const msg = `Can't bind to ${address}`;
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
  const client = socket.client;
  if (!client || client.finished) {
    socket.destroy();
    return;
  }
  client.timedOut = true;
  client.error(408);
};

const configureServer = server => {
  server.instance.serverName = server.name;
  const { address, port, keepAlive, timeout, nagle } = server.config;

  server.instance.on('error', err => {
    serverOnError(err, `${address}:${port}`);
  });

  if (server.instance.setTimeout) {
    server.keepAlive = keepAlive || impress.DEFAULT_KEEP_ALIVE;
    const serverTimeout = timeout || impress.DEFAULT_TIMEOUT;
    server.instance.setTimeout(serverTimeout, serverOnTimeout);
  }

  if (!nagle) {
    server.instance.on('connection', socket => {
      socket.setNoDelay();
    });
  }
};

const startServer = server => {
  impress.server = server;
  if (server.config.testingServer) return;
  const { protocol, transport, address, port } = server.config;
  if (protocol === 'http') {
    if (transport === 'tls') {
      const cert = impress.loadCertificates(server.config);
      if (cert) {
        server.instance = api.https.createServer(cert, impress.dispatcher);
      }
    } else {
      server.instance = api.http.createServer(impress.dispatcher);
    }
    if (server.instance) {
      api.websocket.upgradeServer(server.instance);
    }
  }

  logServerStarted(server);
  if (!server.instance) return;
  configureServer(server);

  if (address === '*') server.instance.listen(port);
  else server.instance.listen(port, address);
};

// Start servers
const startServers = () => {
  const configServers = impress.config.sections.servers;

  if (impress.mode === 'test') {
    configServers.__SERVER_FOR_TESTS__ = { testingServer: true };
  }

  const serverNames = Object.keys(configServers);
  impress.serversCount = serverNames.length;
  impress.serversStarted = 1;

  let workerId = 0;
  for (const serverName of serverNames) {
    const serverConfig = configServers[serverName];

    const server = {
      name: serverName,
      config: serverConfig,
      instance: null,
    };

    if (impress.isMaster) {
      if (serverName === 'master') {
        startServer(server);
      } else if (impress.firstStart) {
        impress.forkWorker(++workerId, server);
      }
    } else if (serverName === impress.serverName) {
      startServer(server);
    }
  }
};

impress.load = async () => {
  ipcStart();
  await loadApplication();
  if (impress.isMaster) {
    impress.log.system('Server started');
  } else {
    process.send({ name: 'impress:start', id: impress.workerId });
    impress.log.system('Worker forked');
  }
  impress.emit('loaded');

  if (!impress.workerApplicationName) {
    startServers();
  }
  impress.gsInterval();
  impress.firstStart = false;
};

// Set garbage collection interval
impress.gsInterval = () => {
  if (typeof global.gc !== 'function') return;
  const interval = impress.config.sections.scale.gc;
  if (interval > 0) setInterval(global.gc, interval);
};

// Unload configuration and stop server
impress.stop = callback => {
  impress.cache.clear();
  const server = impress.server;
  if (!server || !server.instance) {
    impress.log.warn('No active server in worker');
    callback();
    return;
  }

  const applications = Object.values(impress.applications);
  for (const application of applications) {
    application.emit('stopping');
  }

  const graceful = callback => {
    server.instance.close(() => {
      callback();
    });
  };

  const stopped = () => {
    for (const application of applications) {
      application.scheduler.stopTasks();
      application.cache.clear();
      application.stopped = true;
      application.emit('stopped');
    }
    callback();
  };

  const shutdownTimeout = server.config.shutdown || impress.DEFAULT_SHUTDOWN;
  api.metasync.timeout(shutdownTimeout, graceful, stopped);
};

impress.shutdown = (code = 0) => {
  if (impress.finalization) return;
  impress.finalization = true;
  const exit = process.exit.bind(null, code);
  if (impress.isMaster) {
    impress.killWorkers();
    if (!impress.logger) exit();
    impress.log.system('Stopped server');
  } else {
    if (!impress.logger) exit();
    impress.log.system('Worker terminated');
  }
  impress.logger.on('close', () => {
    impress.stop(exit);
  });
  impress.logger.close();
};

// Load SSL certificates
//   server <Object> server configuration
impress.loadCertificates = config => {
  if (config.key && config.cert) {
    const certDir = api.path.join(impress.dir, 'config/ssl');
    const keyFile = api.path.join(certDir, config.key);
    const certFile = api.path.join(certDir, config.cert);
    try {
      const key = api.fs.readFileSync(keyFile);
      const cert = api.fs.readFileSync(certFile);
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
  const exceptId = exceptWorkerId.toString();
  for (const [workerId, worker] of impress.workers) {
    if (worker.process.channel && workerId !== exceptId) {
      worker.process.send(message);
    }
  }
};

// HTTP Dispatcher
//   req <IncomingMessage>
//   res <ServerResponse>
// Returns: <Client>
impress.dispatcher = (req, res) => {
  impress.stat.req++;
  const host = api.common.parseHost(req.headers.host);
  for (const appName in impress.applications) {
    const application = impress.applications[appName];
    const hosts = application.config.sections.hosts;
    let appFound = hosts && hosts.length !== 0;
    if (appFound && !hosts.includes(host)) {
      appFound = false;
      for (const configHost of hosts) {
        if (configHost === host) {
          appFound = true;
          break;
        }
        const index = configHost.indexOf('*');
        if (index === -1) continue;
        if (index === 0) {
          const suffix = configHost.substring(1);
          if (host.endsWith(suffix)) {
            appFound = true;
            break;
          }
        } else {
          const prefix = configHost.substring(0, index);
          if (host.startsWith(prefix)) {
            appFound = true;
            break;
          }
        }
      }
    }
    if (appFound) {
      if (application.started) {
        const client = application.dispatch(req, res);
        return client;
      } else {
        // TODO: impress.application
        const client = new impress.Client(impress, req, res);
        client.error(503);
        return client;
      }
    }
  }
  // No application detected to dispatch request
  // TODO: impress.application
  const client = new impress.Client(impress, req, res);
  client.error(404);
  return client;
};
