'use strict';

process.title = 'impress';

const fsp = require('node:fs').promises;
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { Config } = require('metaconfiguration');
const metavm = require('metavm');
const metautil = require('metautil');
const { loadSchema } = require('metaschema');
const { Logger } = require('metalog');
const { Planner } = require('./lib/planner.js');

const CONFIG_SECTIONS = ['log', 'scale', 'server', 'sessions'];
const PATH = process.cwd();
const WORKER_PATH = path.join(__dirname, 'lib/worker.js');
const LOG_PATH = path.join(PATH, 'log');
const CTRL_C = 3;
const LOG_OPTIONS = { path: LOG_PATH, home: PATH, workerId: 0 };
const CONTEXT = metavm.createContext({ process });
const CFG_OPTIONS = { mode: process.env.MODE, context: CONTEXT };

const impress = {
  logger: null,
  config: null,
  planner: null,
  close: async () => {
    if (impress.logger?.active) await impress.logger.close();
     process.exit(0);
  },
  finalization: false,
  initialization: true,
  console,
  applications: new Map(),
  lastWorkerId: 0,
  startTimer: null,
};

const exit = async (message) => {
  if (impress.finalization) return;
  impress.finalization = true;
  impress.console.info(message);
  if (impress.logger && impress.logger.active) await impress.logger.close();
  process.exit(1);
};

const logError = (type) => (error) => {
  const msg = error?.stack || error?.message || 'exit';
  impress.console.error(`${type}: ${msg}`);
  if (impress.initialization) exit('Can not start Application server');
};

const startWorker = async (app, kind, port, id = ++impress.lastWorkerId) => {
  const workerData = { id, kind, root: app.root, path: app.path, port };
  const options = { trackUnmanagedFds: true, workerData };
  const worker = new Worker(WORKER_PATH, options);
  if (kind === 'worker') {
    app.pool.add(worker);
    await app.pool.capture();
  }
  app.threads.set(id, worker);

  worker.on('exit', (code) => {
    if (code !== 0) startWorker(app, kind, port, id);
    else app.threads.delete(id);
    if (impress.initialization) exit('Can not start Application server');
    if (app.threads.size === 0) {
      impress.applications.delete(app.path);
      if (impress.applications.size === 0) impress.close();
    }
  });

  const handlers = {
    started: ({ kind }) => {
      app.ready++;
      if (kind === 'worker') app.pool.release(worker);
      if (app.threads.size === app.ready) {
        clearTimeout(impress.startTimer);
        impress.initialization = false;
        impress.console.info(`App started: ${app.path}`);
      }
    },

    task: async ({ action, port, task }) => {
      const { planner } = impress;
      task.app = app.path;
      if (action === 'add') port.postMessage({ id: await planner.add(task) });
      else if (action === 'remove') planner.remove(task.id);
      else if (action === 'stop') planner.stop(task.name);
    },

    invoke: async (msg) => {
      const { status, port, exclusive } = msg;
      if (status === 'done') {
        app.pool.release(worker);
        return;
      }
      const promisedThread = exclusive ? app.pool.capture() : app.pool.next();
      const next = await promisedThread.catch(() => {
        const error = new Error('No thread available');
        port.postMessage({ name: 'error', error });
        return null;
      });
      if (!next) return;
      next.postMessage(msg, [port]);
    },
  };

  worker.on('message', (msg) => {
    const handler = handlers[msg.name];
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
      for (const error of checkResult.errors) {
        impress.console.error(`${error} in application/config/${section}.js`);
      }
      valid = false;
    }
  }
  if (!valid) exit('Application server configuration is invalid');
};

const loadApplication = async (root, dir, master) => {
  impress.console.info(`Start: ${dir}`);
  const configPath = path.join(dir, 'config');
  const config = await new Config(configPath, CFG_OPTIONS).catch((error) => {
    exit(`Can not read configuration: ${configPath}\n${error.stack}`);
  });
  await validateConfig(config);
  if (master) {
    impress.startTimer = setTimeout(
      logError('Initialization timeout'),
      config.server.timeouts.start,
    );
    const logger = await new Logger({ ...LOG_OPTIONS, ...config.log });
    logger.on('error', logError('Logger'));
    if (logger.active) impress.console = logger.console;
    impress.logger = logger;
    const tasksPath = path.join(dir, 'tasks');
    const tasksConfig = config.server.scheduler;
    impress.planner = await new Planner(tasksPath, tasksConfig, impress);
    impress.config = config;
  }
  const { balancer, ports = [], workers = {} } = config.server;
  const threads = new Map();
  const pool = new metautil.Pool({ timeout: workers.wait });
  const app = { root, path: dir, config, threads, pool, ready: 0 };
  if (balancer) await startWorker(app, 'balancer', balancer);
  for (const port of ports) await startWorker(app, 'server', port);
  const poolSize = workers.pool || 0;
  for (let i = 0; i < poolSize; i++) await startWorker(app, 'worker');
  impress.applications.set(dir, app);
};

const loadApplications = async () => {
  const applications = await fsp
    .readFile('.applications', 'utf8')
    .then((data) => data.split(/[\r\n\s]+/).filter((s) => s.length !== 0))
    .catch(() => [path.join(PATH, 'application')]);
  let master = true;
  for (const dir of applications) {
    const location = path.isAbsolute(dir) ? dir : path.join(PATH, dir);
    await loadApplication(PATH, location, master);
    if (master) master = false;
  }
};

const stopApplication = (dir) => {
  const app = impress.applications.get(dir);
  for (const thread of app.threads.values()) {
    thread.postMessage({ name: 'stop' });
  }
};

const stop = async () => {
  const portsClosed = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      impress.console.error('Exit with graceful shutdown timeout');
      resolve();
    }, impress.config.server.timeouts.stop);
    impress.close = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
  for (const app of impress.applications.values()) {
    stopApplication(app.path);
  }
  await portsClosed;
  exit('Application server stopped');
};

process.on('uncaughtException', logError('Uncaught exception'));
process.on('warning', logError('Warning'));
process.on('unhandledRejection', logError('Unhandled rejection'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.on('data', (data) => {
    const key = data[0];
    if (key === CTRL_C) stop();
  });
}
loadApplications().catch(logError('Initialization'));
