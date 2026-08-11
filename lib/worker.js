'use strict';

const { node, metarhia, notLoaded, wt } = require('./deps.js');
const { parentPort, threadId, workerData } = wt;

const application = require('./application.js');

const logError = (type) => async (caught) => {
  let error = caught;
  if (!metarhia.metautil.isError(error)) error = new Error('Unknown');
  if (error.name === 'ExperimentalWarning') return;
  const msg = error.stack || error.message || 'no stack trace';
  console.error(`${type}: ${msg}`);
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

let callId = 0;
const calls = new Map();

const invoke = async ({ method, args, exclusive = false }) => {
  const id = ++callId;
  const data = { type: 'call', id, method, args };
  const msg = { name: 'invoke', from: threadId, exclusive, data };
  return new Promise((resolve, reject) => {
    const handler = ({ error, result }) => {
      calls.delete(id);
      if (error) reject(error);
      else resolve(result);
    };
    calls.set(id, handler);
    parentPort.postMessage(msg);
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

  invoke: async ({ from, to, exclusive, data, port }) => {
    if (to) {
      const { id, status, error, result } = data;
      const handler = calls.get(id);
      if (!handler) return;
      const isError = status === 'error';
      const callError = isError ? new Error(error.message) : null;
      return void handler({ error: callError, result });
    }
    const reply = (data) => {
      if (port === undefined) {
        return void parentPort.postMessage({ name: 'invoke', to: from, data });
      }
      port.postMessage(data);
      port.close();
    };
    const { sandbox, config } = application;
    const { timeout } = config.server.workers;
    const { method = '', args = {} } = data;
    const handler = metarhia.metautil.namespaceByPath(sandbox, method);
    if (!handler) {
      const error = { message: 'Handler not found' };
      return void reply({ error, data: null });
    }
    try {
      let promise = handler(args);
      if (timeout) promise = metarhia.metautil.timeoutify(promise, timeout);
      const result = await promise;
      reply({ error: null, data: result });
    } catch (error) {
      reply({ error, data: null });
      application.console.error(error.stack);
    } finally {
      if (exclusive) parentPort.postMessage({ name: 'release' });
    }
  },
};

parentPort.on('message', (msg) => {
  const handler = handlers[msg.name];
  if (handler) handler(msg);
});

const init = async () => {
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
      const libs = Array.from(notLoaded).join('\n');
      console.error(`Can not load modules:\n${libs}`);
    }
    process.exit(0);
  }

  await application.load({ invoke });
  console.info(`Application started in worker ${threadId}`);
  parentPort.postMessage({ name: 'started', kind: workerData.kind });
};

init().catch(logError(`Can not start worker ${threadId}`));
