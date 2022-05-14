'use strict';

process.title = 'impress';

const fsp = require('fs').promises;
const { Worker } = require('worker_threads');
const path = require('path');
const { Config } = require('metaconfiguration');
const metavm = require('metavm');
const metautil = require('metautil');
const { loadSchema } = require('metaschema');
const { Logger } = require('metalog');

const CONFIG_SECTIONS = ['log', 'scale', 'server', 'sessions'];
const PATH = process.cwd();
const WORKER_PATH = path.join(__dirname, 'lib/worker.js');
const CFG_PATH = path.join(PATH, 'application/config');
const LOG_PATH = path.join(PATH, 'log');
const CTRL_C = 3;
const LOG_OPTIONS = { path: LOG_PATH, home: PATH, workerId: 0 };
const CONTEXT = metavm.createContext({ process });
const CFG_OPTIONS = { mode: process.env.MODE, context: CONTEXT };

const impress = {
  logger: null,
  config: null,
  finalized: () => {},
  finalization: false,
  initialization: true,
  console,
  applications: new Map(),
  lastWorkerId: 0,
};

const exit = async (message) => {
  impress.console.info(message);
  if (impress.logger && impress.logger.active) await this.logger.close();
  process.exit(1);
};

const logError = (type) => (err) => {
  const msg = err.stack || err.message || 'no stack trace';
  impress.console.error(`${type}: ${msg}`);
  if (impress.finalization) return;
  if (impress.initialization) exit('Can not start Application server');
};

process.on('uncaughtException', logError('Uncaught exception'));
process.on('warning', logError('Warning'));
process.on('unhandledRejection', logError('Unhandled rejection'));

const startWorker = (app, kind, port, id = ++impress.lastWorkerId) => {
  // TODO: implement kind: 'worker'
  // 'scheduler' will not be kind of worker
  // it will be shared for all apps
  const workerData = { id, kind, path: app.path, port };
  const options = { trackUnmanagedFds: true, workerData };
  const worker = new Worker(WORKER_PATH, options);
  app.threads.set(id, worker);

  worker.on('exit', (code) => {
    if (code !== 0) startWorker(app, kind, port, id);
    else app.threads.delete(id);
    if (app.threads.size === 0) {
      impress.applications.delete(app.path);
      if (impress.applications.size === 0) impress.finalized();
    }
  });

  const handlers = {
    event: ({ name }) => {
      if (name === 'started') {
        app.ready++;
        app.pool.add(worker);
        if (app.threads.size === app.ready) {
          impress.console.info(`App started: ${app.peth}`);
        }
      }
    },

    task: (msg) => {
      impress.console.log({ id, type: 'task', msg });
      //const transferList = msg.port ? [msg.port] : undefined;
      //scheduler.postMessage(msg, transferList);
    },

    invoke: async (msg) => {
      impress.console.log({ id, type: 'invoke', msg });
      /*
      const { name, port, exclusive } = msg;
      if (name === 'done') {
        if (exclusive) pool.release(worker);
        return;
      }
      if (name !== 'request') return;
      const promisedThread = exclusive ? pool.capture() : pool.next();
      const next = await promisedThread.catch(() => {
        port.postMessage({ error: new Error('No thread available') });
        return null;
      });
      if (!next) return;
      next.postMessage(msg, [port]);
      */
    },
  };

  worker.on('message', (msg) => {
    const handler = handlers[msg.type];
    if (handler) handler(msg);
  });
};

const validateConfig = async (config) => {
  let valid = true;
  const schemaPath = path.join(__dirname, 'schemas/config');
  for (const section of CONFIG_SECTIONS) {
    const fileName = path.join(schemaPath, section + '.js');
    const schema = await loadSchema(fileName);
    const checkResult = schema.check(config[section]);
    if (!checkResult.valid) {
      for (const err of checkResult.errors) {
        impress.console.error(`${err} in application/config/${section}.js`);
      }
      valid = false;
    }
  }
  if (!valid) exit('Application server configuration is invalid');
};

const loadApplication = async (root) => {
  impress.console.info(`Start: ${root}`);
  const configPath = path.join(root, 'application/config');
  const config = await new Config(configPath, CFG_OPTIONS).catch((err) => {
    exit(`Can not read configuration: ${CFG_PATH}\n${err.stack}`);
  });
  await validateConfig(config);

  const { balancer, ports = [], workers = {} } = config.server;
  const threads = new Map();
  const pool = new metautil.Pool({ timeout: workers.wait });

  const app = { path: root, config, threads, pool, ready: 0 };

  if (balancer) startWorker(app, 'balancer', balancer);
  for (const port of ports) startWorker(app, 'server', port);
  const poolSize = workers.pool || 0;
  for (let i = 0; i < poolSize; i++) startWorker(app, 'worker');

  impress.applications.set(root, app);
};

const loadApplications = async () => {
  const list = await fsp
    .readFile('.applications', 'utf8')
    .then((data) => data.split('\n').filter((s) => s.length !== 0))
    .catch(() => [PATH]);
  for (const path of list) {
    await loadApplication(path);
  }
};

const stopApplication = (root) => {
  const app = impress.applications.get(root);
  for (const thread of app.threads.values()) {
    thread.postMessage({ type: 'event', name: 'stop' });
  }
};

const stop = async () => {
  impress.finalization = true;
  const logClosed = impress.logger.close();
  const portsClosed = new Promise((resolve) => {
    impress.finalized = resolve;
    setTimeout(() => {
      impress.console.error('Exit with graceful shutdown timeout');
      resolve();
    }, impress.config.server.timeouts.stop);
  });
  for (const app of impress.applications.values()) {
    stopApplication(app.path);
  }
  await Promise.allSettled([logClosed, portsClosed]);
  exit('Application server stopped');
};

(async () => {
  const configPath = path.join(PATH, 'application/config');
  const config = await new Config(configPath, CFG_OPTIONS).catch((err) => {
    exit(`Can not read configuration: ${CFG_PATH}\n${err.stack}`);
  });
  await validateConfig(config);
  impress.config = config;
  const logger = await new Logger({ ...LOG_OPTIONS, ...config.log });
  logger.on('error', logError('Logger'));
  if (logger.active) impress.console = logger.console;
  impress.logger = logger;

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  const startTimer = setTimeout(() => {
    impress.console.warn(`Initialization timeout`);
  }, config.server.timeouts.start);

  await loadApplications();

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => {
      const key = data[0];
      if (key === CTRL_C) stop();
    });
  }
  clearTimeout(startTimer);
  impress.initialization = false;
})().catch(logError('Initialization'));
