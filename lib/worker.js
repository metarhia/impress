'use strict';

const { node, metarhia } = require('./dependencies.js');
const { worker, fsp, path } = node;
const application = require('./application.js');

const { Config } = metarhia.config;
const { Logger } = metarhia.metalog;
const { Server } = metarhia.metacom;
const { loadSchema } = metarhia.metaschema;
const { Auth } = require('./auth.js');

const CONFIG_SECTIONS = ['log', 'scale', 'server', 'sessions'];

const validateConfig = async (config) => {
  const schemaPath = path.join(__dirname, '../schemas/config');
  let valid = true;
  for (const section of CONFIG_SECTIONS) {
    const schema = await loadSchema(path.join(schemaPath, section + '.js'));
    const checkResult = schema.check(config[section]);
    if (!checkResult.valid) {
      for (const err of checkResult.errors) console.log(err);
      valid = false;
    }
  }
  if (!valid) {
    console.error('Can not start server');
    process.exit(1);
  }
};

(async () => {
  const configPath = path.join(application.path, 'config');
  const context = metarhia.metavm.createContext({ process });
  const options = { mode: process.env.MODE, context };
  const config = await new Config(configPath, options);
  await validateConfig(config);
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

  const logError = async (err) => {
    console.error(err ? err.stack : 'No exception stack available');
    if (application.finalization) return;
    if (application.initialization) {
      console.info(`Can not start Application in worker ${threadId}`);
      await application.shutdown();
      process.exit(0);
    }
  };

  process.on('uncaughtException', logError);
  process.on('warning', logError);
  process.on('unhandledRejection', logError);

  if (config.server.protocol === 'https') {
    const certPath = path.join(application.path, 'cert');
    try {
      const key = await fsp.readFile(path.join(certPath, 'key.pem'));
      const cert = await fsp.readFile(path.join(certPath, 'cert.pem'));
      application.cert = { key, cert };
    } catch {
      if (threadId === 1) console.error('Can not load TLS certificates');
      process.exit(0);
    }
  }

  const { balancer, ports = [] } = config.server;
  const servingThreads = ports.length + (balancer ? 1 : 0);
  if (threadId <= servingThreads) {
    application.server = new Server(config.server, application);
    const { port } = application.server;
    console.info(`Listen port ${port} in worker ${threadId}`);
  }

  await application.init();
  console.info(`Application started in worker ${threadId}`);

  worker.parentPort.on('message', async (message) => {
    if (message.name === 'stop') {
      if (application.finalization) return;
      console.info(`Graceful shutdown in worker ${threadId}`);
      await application.shutdown();
      process.exit(0);
    }
  });
})();
