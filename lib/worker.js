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

(async () => {
  const configPath = path.join(application.path, 'config');
  const context = metavm.createContext({ process });
  const options = { mode: process.env.MODE, context };
  const config = await new Config(configPath, options);
  const logPath = path.join(application.root, 'log');
  const home = application.root;
  const logger = await new Logger({
    path: logPath,
    workerId: threadId,
    ...config.log,
    home,
  });
  const { console } = logger;
  Object.assign(application, { config, logger, console });

  const logError = async (err) => {
    console.error(err ? err.stack : 'No exception stack available');
    if (application.finalization) return;
    if (application.initialization) {
      console.info(`Can not start Application in worker ${threadId}`);
      await application.shutdown();
      process.exit(0);
    }
  };

  if (notLoaded.size > 0) {
    if (threadId === 1) {
      const libs = Array.from(notLoaded).join(', ');
      console.error(`Can not load modules: ${libs}`);
    }
    process.exit(0);
  }

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
})();
