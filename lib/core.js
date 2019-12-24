'use strict';

process.title = 'impress';

//const DEFAULT_KEEP_ALIVE = 5 * 1000;
//const DEFAULT_TIMEOUT = 30 * 1000;
//const DEFAULT_SHUTDOWN = 5 * 1000;

global.api = {};
require('./dependencies');

const { EventEmitter } = api.events;

const shortenStack = stack => {
  if (!stack) return '';
  if (!stack.includes(impress.dir)) return stack;
  const nmPath = '/node_modules';
  const result = stack.split(api.path.resolve(impress.dir))
    .map(line => {
      if (line.startsWith(nmPath)) return line.slice(nmPath.length);
      return line;
    })
    .join('');
  return result;
};

// Fatal error with process termination
//   err <Error> | <string>
const fatalError = err => {
  if (!err.stack) err = new Error(err);
  const msg = err.code === 'EBIND' ? err.message : shortenStack(err.stack);
  if (!impress.log) {
    console.error(msg);
    impress.shutdown(1);
  }
  impress.log.error(msg);
  impress.log.system('Crashed');
  impress.shutdown(1);
};

// Log exception
//   err <Error>
/*const logException = err => {
  const stack = impress.shortenStack(err.stack);
  if (impress.log) impress.log.error(stack);
  else console.error(stack);
};*/

class Impress extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.finalization = false;
    this.dir = process.cwd();
    this.serverMode = process.env.SERVER_MODE || '';
    this.applicationsDir = api.path.join(this.dir, 'applications');
    const { env } = process;
    this.workerApplication = env.WORKER_APPLICATION || '';
    this.workerId = parseInt(env.WORKER_ID, 10);
    this.workerServer = env.WORKER_SERVER;
    this.workerProto = env.WORKER_PROTO;
    this.workerPort = env.WORKER_PORT;
    this.isMaster = !this.workerApplication;
    this.server = null;
    this.application = null;
    this.config = null;
  }

  async start() {
    process.exit(0);
    const sandbox = { Duration: api.common.duration };
    api.vm.createContext(sandbox);
    const options = { sandbox, mode: impress.serverMode };
    const configDir = api.path.join(impress.dir, 'config');
    impress.config = await new api.Config(configDir, options);
    if (impress.isMaster) {
      const serverId = impress.config.sections.scale.server;
      impress.serverId = serverId;
      impress.log.system('Server started');
    } else {
      //process.send({ name: 'impress:start', id: impress.workerId });
      impress.log.system('Worker forked');
    }
  }

  async shutdown(code = 0) {
    if (impress.finalization) return;
    impress.finalization = true;
    const exit = () => {
      process.exit(code);
    };
    if (impress.server) {
      impress.server.close(() => {});
      //const shutdownTimeout = impress.config.shutdown || DEFAULT_SHUTDOWN;
      //api.metasync.timeout(shutdownTimeout, graceful, stopped);
    }
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
  }

  async forkApplications() {
    try {
      const apps = await api.fs.promises.readdir(impress.applicationsDir);
      impress.workerApplications = apps;
      await impress.initApplication();
    } catch (err) {
      impress.fatalError(impress.CANT_READ_DIR + impress.applicationsDir);
    }
  }

  async initApplication() {
    const name = impress.workerApplicationName;
    const dir = api.path.join(impress.applicationsDir, name);
    await api.fs.promises.access(dir);
    const application = new impress.Application(name, dir);
    impress.application = application;
    await api.events.once(application, 'started');
  }

  async initServer() {
    const { server } = impress;
    const { protocol, transport, address, port } = impress.server.config;
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
  }

  gcInit() {
    if (typeof global.gc !== 'function') return;
    const interval = impress.config.sections.scale.gc;
    if (interval > 0) setInterval(global.gc, interval);
  }
}

global.impress = new Impress();

process.on('uncaughtException', fatalError);

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

process.on('SIGTERM', () => {
  console.log('SIGTERM');
  //shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGTERM');
  //shutdown();
});

process.on('SIGHUP', () => {
  console.log('SIGTERM');
  //shutdown();
});

console.log({ isTTY: process.stdin.isTTY });
if (impress.isMaster && process.stdin.isTTY) {
  //process.stdin.setRawMode(true);
  //process.stdin.on('data', (data) => {
  //  const key = data[0];
  //  if (key === 3) shutdown();
  //});
}

const initLogger = () => {
  const logDir = api.path.join(impress.dir, 'log');
  const config = impress.config.sections.log;
  const { writeInterval, writeBuffer, keepDays, toStdout, toFile } = config;
  api.fs.mkdirSync(logDir, { recursive: true });
  impress.logger = api.metalog({
    path: logDir, node: impress.workerId,
    writeInterval, writeBuffer, keepDays,
    toStdout, toFile
  });
  impress.log = impress.logger.bind('impress');
};

/*
// Print information about started server to stdout and logs
//   server <Object>, server instance
const logServerStarted = server => {
  const { protocol, address, port } = server.config;
  const protocolName = protocol.toUpperCase();
  let message = `${protocolName} listen on ${address}:${port}`;
  if (!server.instance) message += ' FAILED';
  impress.log.system(message);
};

const serverOnError = (err, address) => {
  if (['EADDRINUSE', 'EACCES'].includes(err.code)) {
    const msg = `Can't bind to ${address}`;
    if (!impress.isMaster) {
      process.send({ name: 'impress:exit', error: msg });
    } else {
      const error = new Error(msg);
      error.code = 'EBIND';
      fatalError(error);
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
    server.keepAlive = keepAlive || DEFAULT_KEEP_ALIVE;
    const serverTimeout = timeout || DEFAULT_TIMEOUT;
    server.instance.setTimeout(serverTimeout, serverOnTimeout);
  }

  if (!nagle) {
    server.instance.on('connection', socket => {
      socket.setNoDelay();
    });
  }
};
*/

module.exports = impress;
