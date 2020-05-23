'use strict';

const PATH = process.cwd();

const { worker, fsp, path } = require('./dependencies.js');
const { threadId } = worker;

const Application = require('./application.js');
const Config = require('@metarhia/config');
const metalog = require('metalog');
const Database = require('./database.js');
const Server = require('./server.js');
const initAuth = require('./auth.js');
const Console = require('./console.js');

(async () => {
  const configPath = path.join(PATH, 'application/config');
  const config = await new Config(configPath);
  const logPath = path.join(PATH, 'log');
  const logger = await metalog({
    path: logPath, workerId: threadId, ...config.sections.log
  });
  const console = new Console(logger);
  const application = new Application();
  Object.assign(application, { config, logger, console });
  const certPath = path.join(PATH, 'application/cert');
  try {
    const key = await fsp.readFile(path.join(certPath, 'key.pem'));
    const cert = await fsp.readFile(path.join(certPath, 'cert.pem'));
    application.cert = { key, cert };
  } catch {
    if (threadId === 1) logger.error('Can not load TLS certificates');
  }
  application.db = new Database(config.sections.database, application);
  application.server = new Server(config.sections.server, application);
  application.auth = initAuth(application);
  application.sandboxInject('auth', application.auth);
  application.sandbox = application.createSandbox();
  await application.init();
  application.auth.fillPool();
  logger.system(`Application started in worker ${threadId}`);

  worker.parentPort.on('message', async message => {
    if (message.name === 'stop') {
      if (application.finalization) return;
      logger.system(`Graceful shutdown in worker ${threadId}`);
      await application.shutdown();
      process.exit(0);
    }
  });

  const logError = err => {
    logger.error(err.stack);
  };

  process.on('uncaughtException', logError);
  process.on('warning', logError);
  process.on('unhandledRejection', logError);
})();
