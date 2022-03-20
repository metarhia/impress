'use strict';

const path = require('path');
const fsp = require('fs').promises;
const { parentPort, threadId } = require('worker_threads');
const { Config } = require('metaconfiguration');
const { Logger } = require('metalog');
const { Server } = require('metacom');
const metavm = require('metavm');
const { notLoaded } = require('./dependencies.js');
const application = require('./application.js');

const logError = (type) => async (err) => {
  const msg = err.stack || err.message || 'no stack trace';
  console.error(`${type} error: ${msg}`);
  if (application.finalization) return;
  if (application.initialization) {
    console.info(`Can not start Application in worker ${threadId}`);
    await application.shutdown();
    process.exit(0);
  }
};

process.on('uncaughtException', logError('uncaughtException'));
process.on('warning', logError('warning'));
process.on('unhandledRejection', logError('unhandledRejection'));

(async () => {
  const cfgPath = path.join(application.path, 'config');
  const context = metavm.createContext({ process });
  const config = await new Config(cfgPath, { mode: process.env.MODE, context });
  const logPath = path.join(application.root, 'log');
  const home = application.root;
  const logOptions = { path: logPath, workerId: threadId, ...config.log, home };
  const logger = await new Logger(logOptions);
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

  let kind = 'worker';
  if (threadId <= servingThreads) kind = 'server';
  if (threadId === servingThreads + 1) kind = 'scheduler';

  if (kind === 'server') {
    application.server = new Server(config.server, application);
  }

  await application.init(kind);
  console.info(`Application started in worker ${threadId}`);
  parentPort.postMessage({ type: 'event', name: 'started' });

  parentPort.on('message', async ({ type, name }) => {
    if (type !== 'event' || name !== 'stop') return;
    if (application.finalization) return;
    console.info(`Graceful shutdown in worker ${threadId}`);
    await application.shutdown();
    process.exit(0);
  });
})().catch((err) => {
  console.info(`Can not start Application in worker ${threadId}`, err);
});
