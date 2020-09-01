'use strict';

const { node, npm, protect } = require('./dependencies.js');
const { worker, fsp, path } = node;
const application = require('./application.js');

const Config = require('@metarhia/config');
const metalog = require('metalog');
const Database = require('./database.js');
const Metacom = require('./metacom.js');
const Client = require('./client.js');
const initAuth = require('./auth.js');
const Console = require('./console.js');

(async () => {
  const configPath = path.join(application.path, 'config');
  const { sections: config } = await new Config(configPath);
  if (config.impress) protect(config.impress, node, npm);
  const logPath = path.join(application.root, 'log');
  const home = application.path;
  const { threadId } = worker;
  const logger = await metalog({
    path: logPath, workerId: threadId, ...config.log, home
  });
  const console = new Console(logger);
  Object.assign(application, { config, logger, console });

  const logError = err => {
    logger.error(err ? err.stack : 'No exception stack available');
  };

  process.on('uncaughtException', logError);
  process.on('warning', logError);
  process.on('unhandledRejection', logError);

  const certPath = path.join(application.path, 'cert');
  try {
    const key = await fsp.readFile(path.join(certPath, 'key.pem'));
    const cert = await fsp.readFile(path.join(certPath, 'cert.pem'));
    application.cert = { key, cert };
  } catch {
    if (threadId === 1) logger.error('Can not load TLS certificates');
  }
  application.db = new Database(config.database);

  const { balancer, ports } = config.server;
  const servingThreads = ports.length + (balancer ? 1 : 0);
  if (threadId <= servingThreads) {
    const options = { application, Client };
    application.server = new Metacom.Server(config.server, options);
    const { port } = application.server;
    logger.system(`Listen port ${port} in worker ${threadId}`);
    application.auth = initAuth();
    application.sandboxInject('auth', application.auth);
  }

  await application.init();
  logger.system(`Application started in worker ${threadId}`);

  worker.parentPort.on('message', async message => {
    if (message.name === 'stop') {
      if (application.finalization) return;
      logger.system(`Graceful shutdown in worker ${threadId}`);
      await application.shutdown();
      process.exit(0);
    }
  });
})();
