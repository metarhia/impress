'use strict';

const { node, metarhia, notLoaded, wt } = require('./deps.js');
const application = require('./application.js');

const logError = (type) => async (error) => {
  if (error.name === 'ExperimentalWarning') return;
  const msg = error.stack || error.message || 'no stack trace';
  console.error(type + ': ' + msg);
  if (application.initialization) {
    console.info(`Initialization failed in worker ${wt.threadId}`);
    await application.shutdown();
    process.exit(0);
  }
};

process.removeAllListeners('warning');
process.on('warning', logError('warning'));
process.on('uncaughtException', logError('uncaughtException'));
process.on('unhandledRejection', logError('unhandledRejection'));

(async () => {
  const cfgPath = node.path.join(application.path, 'config');
  const context = metarhia.metavm.createContext({ process });
  const cfgOptions = { mode: process.env.MODE, context };
  const { Config } = metarhia.metaconfiguration;
  const config = await new Config(cfgPath, cfgOptions);
  const logPath = node.path.join(application.root, 'log');
  const home = application.root;
  const workerId = wt.threadId;
  const logOptions = { path: logPath, workerId, ...config.log, home };
  const logger = await new metarhia.metalog.Logger(logOptions);
  logger.on('error', logError('logger error'));
  if (logger.active) global.console = logger.console;
  Object.assign(application, { config, logger, console });

  if (notLoaded.size > 0) {
    if (wt.threadId === 1) {
      const libs = Array.from(notLoaded).join(', ');
      console.error(`Can not load modules: ${libs}`);
    }
    process.exit(0);
  }

  const stop = async () => {
    if (application.finalization) return;
    console.info(`Graceful shutdown in worker ${wt.threadId}`);
    await application.shutdown();
    process.exit(0);
  };

  const invoke = async ({ exclusive, data, port }) => {
    const { method, args } = data;
    const { sandbox } = application;
    const handler = metarhia.metautil.namespaceByPath(sandbox, method);
    if (!handler) {
      const error = new Error('Handler not found');
      return void port.postMessage({ name: 'error', error });
    }
    const msg = { name: 'invoke', status: 'done' };
    try {
      const result = await handler(args);
      port.postMessage({ ...msg, data: result });
    } catch (error) {
      port.postMessage({ name: 'error', error });
      application.console.error(error.stack);
    } finally {
      if (exclusive) wt.parentPort.postMessage(msg);
    }
  };

  const handlers = { stop, invoke };

  await application.init();

  const { kind, port } = wt.workerData;
  if (kind === 'server' || kind === 'balancer') {
    const options = { ...config.server, port, kind };
    if (config.server.protocol === 'https') {
      options.SNICallback = (servername, callback) => {
        const domain = application.cert.get(servername);
        if (!domain) callback(new Error(`No certificate for ${servername}`));
        else callback(null, domain.creds);
      };
    }
    application.server = new metarhia.metacom.Server(application, options);

    application.server.on('error', (err) => {
      const msg = {
        name: 'terminate',
        message: `Serever Error: ${err.message}`,
      };
      wt.parentPort.postMessage(msg);
    });
  }

  wt.parentPort.on('message', async (msg) => {
    const handler = handlers[msg.name];
    if (handler) handler(msg);
  });

  console.info(`Application started in worker ${wt.threadId}`);
  wt.parentPort.postMessage({ name: 'started', kind });
})().catch(logError(`Can not start worker ${wt.threadId}`));
