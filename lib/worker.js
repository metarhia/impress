'use strict';

const { worker, fsp, path } = require('./dependencies.js');
const application = require('./application.js');

const Config = require('@metarhia/config');
const metalog = require('metalog');
const Database = require('./database.js');
const Server = require('./server.js');
const initAuth = require('./auth.js');
const Console = require('./console.js');

(async () => {
  const configPath = path.join(application.path, 'config');
  const config = await new Config(configPath);
  const logPath = path.join(application.root, 'log');
  const home = application.path;
  const logger = await metalog({
    path: logPath, workerId: worker.threadId, ...config.sections.log, home
  });
  const console = new Console(logger);
  Object.assign(application, { config, logger, console });
  const certPath = path.join(application.path, 'cert');
  try {
    const key = await fsp.readFile(path.join(certPath, 'key.pem'));
    const cert = await fsp.readFile(path.join(certPath, 'cert.pem'));
    application.cert = { key, cert };
  } catch {
    if (worker.threadId === 1) logger.error('Can not load TLS certificates');
  }
  application.db = new Database(config.sections.database);
  application.server = new Server(config.sections.server);
  application.auth = initAuth();
  application.sandboxInject('auth', application.auth);
  await application.init();
  logger.system(`Application started in worker ${worker.threadId}`);

  worker.parentPort.on('message', async message => {
    if (message.name === 'stop') {
      if (application.finalization) return;
      logger.system(`Graceful shutdown in worker ${worker.threadId}`);
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
