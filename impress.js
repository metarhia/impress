'use strict';

process.title = 'impress';

const fsp = require('node:fs').promises;
const { Worker, MessageChannel } = require('node:worker_threads');
const path = require('node:path');

const { Config } = require('metaconfiguration');
const metavm = require('metavm');
const { Pool, isError } = require('metautil');
const { Logger } = require('metalog');
const { MetacomPeer } = require('metacom');

const { Planner, runOnPool } = require('./lib/planner.js');
const configLib = require('./lib/config.js');
const { collectConfigErrors, loadProviders, planThreads } = configLib;

const PATH = process.cwd();
const WORKER_PATH = path.join(__dirname, 'lib/worker.js');
const REPORTER_PATH = `file://${path.join(__dirname, 'lib/reporter.js')}`;
const LOG_PATH = path.join(PATH, 'log');
const CTRL_C = 3;
const LOG_OPTIONS = { path: LOG_PATH, home: PATH, workerId: 0 };
const CONTEXT = metavm.createContext({ process });
const CFG_OPTIONS = { mode: process.env.MODE, context: CONTEXT };

const impress = {
  logger: null,
  config: null,
  planner: null,
  close: () => {},
  finalization: false,
  initialization: true,
  console,
  applications: new Map(),
  lastWorkerId: 0,
  startTimer: null,
};

const exit = async (message, code) => {
  if (impress.finalization) return;
  impress.finalization = true;
  impress.console.info(message);
  if (impress.logger?.active) await impress.logger.close();
  process.exit(code);
};

const logError = (type) => (caught) => {
  const error = isError(caught) ? caught : new Error('Unknown');
  if (error.name === 'ExperimentalWarning') return;
  const msg = error.stack || error.message || 'exit';
  impress.console.error(`${type}: ${msg}`);
  if (type === 'warning') return;
  if (impress.initialization) exit('Can not start Application server', 1);
};

const sendAll = (app, unit, name, data) => {
  for (const link of app.links.values()) link.send(unit, name, data);
};

const threadUnits = (app, worker, kind) => ({
  thread: {
    started: async () => {
      app.ready++;
      if (kind === 'worker') app.pool.release(worker);
      if (app.threads.size !== app.ready) return;
      clearTimeout(impress.startTimer);
      impress.initialization = false;
      impress.console.info(`App started: ${app.path}`);
      sendAll(app, 'thread', 'ready', {});
    },
    terminate: async ({ code }) => {
      process.emit('TERMINATE', code);
    },
  },
  planner: {
    add: (task) => impress.planner.add({ ...task, app: app.path }),
    remove: ({ id }) => impress.planner.remove(id),
    stop: ({ name }) => impress.planner.stop(name),
  },
  pool: {
    invoke: (request) => runOnPool(app, request),
  },
});

const startWorker = async (app, kind, thread, id = ++impress.lastWorkerId) => {
  const { port1, port2 } = new MessageChannel();
  const { root } = app;
  const workerData = { id, kind, root, path: app.path, thread, port: port2 };
  const execArgv = [...process.execArgv, `--test-reporter=${REPORTER_PATH}`];
  const transferList = [port2];
  const trackUnmanagedFds = true;
  const options = { trackUnmanagedFds, workerData, execArgv, transferList };
  const worker = new Worker(WORKER_PATH, options);
  const link = new MetacomPeer({ port: port1 });
  const units = threadUnits(app, worker, kind);
  const names = Object.keys(units);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    link.register(name, units[name]);
  }
  await link.open();
  app.links.set(worker, link);
  if (kind === 'worker') {
    app.pool.add(worker);
    await app.pool.capture();
  }
  app.threads.set(id, worker);

  worker.on('error', (error) => {
    impress.console.error(error.message);
  });

  worker.on('exit', (code) => {
    app.links.delete(worker);
    link.close();
    if (code !== 0) startWorker(app, kind, thread, id);
    else app.threads.delete(id);
    if (impress.initialization) exit('Can not start Application server', 1);
    if (app.threads.size === 0) {
      impress.applications.delete(app.path);
      if (impress.applications.size === 0) impress.close();
    }
  });
};

const validateConfig = async (config, discovered) => {
  const root = __dirname;
  const messages = await collectConfigErrors(config, root, discovered);
  for (let i = 0; i < messages.length; i++) {
    impress.console.error(messages[i]);
  }
  if (messages.length > 0) {
    await exit('Application server configuration is invalid', 1);
  }
};

const loadApplication = async (dir, master, discovered) => {
  impress.console.info(`Start: ${dir}`);
  const configPath = path.join(dir, 'config');
  const config = await new Config(configPath, CFG_OPTIONS).catch((error) => {
    const { stack } = error;
    exit(`Can not read configuration: ${configPath}\n${stack}`, 1);
  });
  await validateConfig(config, discovered);
  if (master) {
    impress.startTimer = setTimeout(
      logError('Initialization timeout'),
      config.lifecycle.start,
    );
    const logger = await new Logger({ ...LOG_OPTIONS, ...config.log });
    logger.on('error', logError('Logger'));
    if (logger.active) impress.console = logger.console;
    impress.logger = logger;
    const tasksPath = path.join(dir, 'tasks');
    const tasksConfig = config.scheduler;
    impress.planner = await new Planner(tasksPath, tasksConfig, impress);
    impress.config = config;
  }
  const workers = config.workers;
  const threads = new Map();
  const pool = new Pool({ timeout: workers.wait });
  const links = new Map();
  const app = { root: PATH, path: dir, config, threads, pool, links, ready: 0 };
  const known = discovered.providers;
  const planned = planThreads(config.server, config.network, known);
  for (let i = 0; i < planned.length; i++) {
    const thread = planned[i];
    const front = thread.balance || thread.redirect;
    const kind = front ? 'balancer' : 'server';
    await startWorker(app, kind, thread);
  }
  const poolSize = workers.pool || 0;
  for (let i = 0; i < poolSize; i++) await startWorker(app, 'worker', null);
  impress.applications.set(dir, app);
};

const parseApplicationsFile = async () => {
  try {
    const data = await fsp.readFile('.applications', 'utf8');
    return data.split(/[\r\n\s]+/).filter((s) => s.length !== 0);
  } catch {
    return [path.join(PATH, 'application')];
  }
};

const loadApplications = async () => {
  const applications = await parseApplicationsFile();
  const discovered = loadProviders(PATH);
  for (let i = 0; i < applications.length; i++) {
    const dir = applications[i];
    const location = path.isAbsolute(dir) ? dir : path.join(PATH, dir);
    await loadApplication(location, i === 0, discovered);
  }
};

const stop = async (signal = 'SIGINT', code = 0) => {
  const portsClosed = new Promise((resolve) => {
    impress.console.info('Graceful shutdown in worker 0');
    const timeout = setTimeout(() => {
      impress.console.error('Exit with graceful shutdown timeout');
      resolve();
    }, impress.config.lifecycle.stop);
    impress.close = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
  for (const app of impress.applications.values()) {
    for (const link of app.links.values()) {
      const stopping = link.call('thread', 'stop');
      stopping.catch(() => undefined);
    }
  }
  await portsClosed;
  exit(`Application server stopped by ${signal}`, code);
};

process.removeAllListeners('warning');
process.on('warning', logError('warning'));
process.on('uncaughtException', logError('Uncaught exception'));
process.on('unhandledRejection', logError('Unhandled rejection'));
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('TERMINATE', (code) => stop('TERMINATE', code));

// Windows child.kill(SIGINT|SIGTERM) calls TerminateProcess and never
// runs the handlers above. A parent can spawn with an IPC channel and
// send 'shutdown' to take the same path.
if (process.connected) {
  process.on('message', (message) => {
    if (message === 'shutdown') stop('SIGTERM');
  });
}

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.on('data', (data) => {
    const key = data[0];
    if (key === CTRL_C) stop();
  });
}
loadApplications().catch(logError('Initialization'));
