'use strict';

const { node, metarhia, notLoaded, wt } = require('./deps.js');
const { threadId } = wt;
const { isError, namespaceByPath, timeoutify } = metarhia.metautil;

const application = require('./application.js');
const { peer } = require('./link.js');

const LINK_MARGIN_MS = 1000;

const logError = (type) => async (caught) => {
  const error = isError(caught) ? caught : new Error('Unknown');
  if (error.name === 'ExperimentalWarning') return;
  const msg = error.stack || error.message || 'no stack trace';
  console.error(`${type}: ${msg}`);
  if (application.initialization) {
    console.info(`Initialization failed in worker ${threadId}`);
    await application.shutdown();
    process.exit(0);
  }
};

const onWarning = logError('warning');
const onUncaught = logError('uncaughtException');
const onRejection = logError('unhandledRejection');

process.removeAllListeners('warning');
process.on('warning', onWarning);
process.on('uncaughtException', onUncaught);
process.on('unhandledRejection', onRejection);

const invoke = ({ method, args, exclusive = false }) => {
  const { wait, timeout } = application.config.workers;
  const limit = { timeout: wait + timeout + LINK_MARGIN_MS };
  return peer.call('pool', 'invoke', { method, args, exclusive }, limit);
};

const run = async ({ method = '', args = {} }) => {
  const { sandbox, config } = application;
  const handler = namespaceByPath(sandbox, method);
  if (!handler) throw new Error('Handler not found');
  const { timeout } = config.workers;
  try {
    let promise = handler(args);
    if (timeout) promise = timeoutify(promise, timeout);
    return await promise;
  } catch (error) {
    application.console.error(error.stack);
    throw error;
  }
};

const stop = async () => {
  if (application.finalization) return;
  console.info(`Graceful shutdown in worker ${threadId}`);
  await application.shutdown();
  process.exit(0);
};

peer.register('thread', { stop });
peer.subscribe('thread', 'ready', () => {
  application.emit('ready');
});

const init = async () => {
  await peer.open();
  const cfgPath = node.path.join(application.path, 'config');
  const context = metarhia.metavm.createContext({ process });
  const cfgOptions = { mode: process.env.MODE, context };
  const { Config } = metarhia.metaconfiguration;
  const config = await new Config(cfgPath, cfgOptions);
  const logPath = node.path.join(application.root, 'log');
  const home = application.root;
  const logOptions = { path: logPath, workerId: threadId, ...config.log, home };
  const logger = await new metarhia.metalog.Logger(logOptions);
  const onLoggerError = logError('logger error');
  logger.on('error', onLoggerError);
  if (logger.active) global.console = logger.console;
  application.config = config;
  application.logger = logger;
  application.console = console;

  if (notLoaded.size > 0) {
    if (threadId === 1) {
      const libs = Array.from(notLoaded).join('\n');
      console.error(`Can not load modules:\n${libs}`);
    }
    process.exit(0);
  }

  await application.load({ invoke });
  if (application.sandbox) peer.register('pool', { run });
  console.info(`Application started in worker ${threadId}`);
  await peer.call('thread', 'started');
};

init().catch(logError(`Can not start worker ${threadId}`));
