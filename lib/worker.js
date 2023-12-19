'use strict';

const { node, metarhia, notLoaded, wt } = require('./deps.js');
const { MessageChannel, parentPort, threadId, workerData } = wt;

const application = require('./application.js');

const logError = (type) => async (err) => {
  const error = metarhia.metautil.isError(err) ? err : new Error('Unknown');
  if (error.name === 'ExperimentalWarning') return;
  const msg = error.stack || error.message || 'no stack trace';
  console.error(type + ': ' + msg);
  if (application.initialization) {
    console.info(`Initialization failed in worker ${threadId}`);
    await application.shutdown();
    process.exit(0);
  }
};

process.removeAllListeners('warning');
process.on('warning', logError('warning'));
process.on('uncaughtException', logError('uncaughtException'));
process.on('unhandledRejection', logError('unhandledRejection'));

const invoke = async ({ method, args, exclusive = false }) => {
  const { port1: port, port2 } = new MessageChannel();
  const data = { method, args };
  const msg = { name: 'invoke', exclusive, data, port };
  return new Promise((resolve, reject) => {
    port2.on('message', ({ error, data }) => {
      port2.close();
      if (error) reject(error);
      else resolve(data);
    });
    parentPort.postMessage(msg, [port]);
  });
};

const handlers = {
  ready: async () => {
    application.emit('ready');
  },

  stop: async () => {
    if (application.finalization) return;
    console.info(`Graceful shutdown in worker ${threadId}`);
    await application.shutdown();
    process.exit(0);
  },

  invoke: async ({ exclusive, data, port }) => {
    const { method, args } = data;
    const { sandbox, config } = application;
    const handler = metarhia.metautil.namespaceByPath(sandbox, method);
    if (!handler) {
      const error = new Error('Handler not found');
      return void port.postMessage({ name: 'error', error });
    }
    const msg = { name: 'invoke', status: 'done' };
    const { timeout } = config.server.workers;
    try {
      let result;
      if (timeout) {
        const ac = new AbortController();
        result = await Promise.race([
          metarhia.metautil.timeout(timeout, ac.signal),
          handler(args),
        ]);
        ac.abort();
      } else {
        result = await handler(args);
      }
      port.postMessage({ ...msg, data: result });
    } catch (error) {
      port.postMessage({ name: 'error', error });
      application.console.error(error.stack);
    } finally {
      if (exclusive) parentPort.postMessage(msg);
    }
  },
};

parentPort.on('message', async (msg) => {
  const handler = handlers[msg.name];
  if (handler) handler(msg);
});

(async () => {
  const cfgPath = node.path.join(application.path, 'config');
  const context = metarhia.metavm.createContext({ process });
  const cfgOptions = { mode: process.env.MODE, context };
  const { Config } = metarhia.metaconfiguration;
  const config = await new Config(cfgPath, cfgOptions);
  const logPath = node.path.join(application.root, 'log');
  const home = application.root;
  const logOptions = { path: logPath, workerId: threadId, ...config.log, home };
  const logger = await new metarhia.metalog.Logger(logOptions);
  logger.on('error', logError('logger error'));
  if (logger.active) global.console = logger.console;
  Object.assign(application, { config, logger, console });

  if (notLoaded.size > 0) {
    if (threadId === 1) {
      const libs = Array.from(notLoaded).join(', ');
      console.error(`Can not load modules: ${libs}`);
    }
    process.exit(0);
  }

  await application.load({ invoke });
  console.info(`Application started in worker ${threadId}`);
  parentPort.postMessage({ name: 'started', kind: workerData.kind });
})().catch(logError(`Can not start worker ${threadId}`));
