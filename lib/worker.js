'use strict';

const { node, metarhia } = require('./dependencies.js');
const { worker, fsp, path } = node;
const application = require('./application.js');

const { Config } = metarhia.config;
const { Logger } = metarhia.metalog;
const { Server, Channel } = metarhia.metacom;
const { Auth } = require('./auth.js');

(async () => {
  const configPath = path.join(application.path, 'config');
  const options = { mode: process.env.MODE };
  const config = await new Config(configPath, options);
  const logPath = path.join(application.root, 'log');
  const home = application.root;
  const { threadId } = worker;
  const logger = await new Logger({
    path: logPath,
    workerId: threadId,
    ...config.log,
    home,
  });
  const { console } = logger;
  const auth = new Auth({ ...config.sessions });
  Object.assign(application, { config, logger, console, auth });

  const logError = err => {
    console.error(err ? err.stack : 'No exception stack available');
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
    if (threadId === 1) console.error('Can not load TLS certificates');
  }

  const { balancer, ports = [] } = config.server;
  const servingThreads = ports.length + (balancer ? 1 : 0);
  if (threadId <= servingThreads) {
    const options = { application, Channel };
    application.server = new Server(config.server, options);
    const { port } = application.server;
    console.info(`Listen port ${port} in worker ${threadId}`);
  }

  await application.init();
  console.info(`Application started in worker ${threadId}`);

  worker.parentPort.on('message', async message => {
    if (message.name === 'stop') {
      if (application.finalization) return;
      console.info(`Graceful shutdown in worker ${threadId}`);
      await application.shutdown();
      process.exit(0);
    }
  });
})();
