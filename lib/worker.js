'use strict';

const api = require('./dependencies.js');
const { worker, fsp, path } = api;
const application = require('./application.js');

const pkg = require('../package.json');

const Config = require('@metarhia/config');
const metalog = require('metalog');
const Database = require('./database.js');
const Metacom = require('./metacom.js');
const Client = require('./client.js');
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

  const logError = err => {
    logger.error(err);
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
    if (worker.threadId === 1) logger.error('Can not load TLS certificates');
  }
  if (pkg.dependencies) {
    for (const dependency of Object.keys(pkg.dependencies)) {
      if (dependency !== 'impress') api[dependency] = require(dependency);
    }
  }
  Object.freeze(api);
  application.db = new Database(config.sections.database);
  const options = { application, Client };
  application.server = new Metacom.Server(config.sections.server, options);
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

})();
