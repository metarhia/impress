'use strict';

process.title = 'impress';

const { Worker } = require('worker_threads');
const path = require('path');
const { Config } = require('metaconfiguration');
const metavm = require('metavm');
const metautil = require('metautil');
const { loadSchema } = require('metaschema');
const { Logger } = require('metalog');

const CONFIG_SECTIONS = ['log', 'scale', 'server', 'sessions'];
const PATH = process.cwd();
const CFG_PATH = path.join(PATH, 'application/config');
const LOG_PATH = path.join(PATH, 'log');
const CTRL_C = 3;

(async () => {
  const logOpt = { path: LOG_PATH, workerId: 0, toFile: [] };
  const { console } = await new Logger(logOpt);

  const exit = (message = 'Can not start server') => {
    console.error(metautil.replace(message, PATH, ''));
    process.exit(1);
  };

  const validateConfig = async (config) => {
    const schemaPath = path.join(__dirname, 'schemas/config');
    let valid = true;
    for (const section of CONFIG_SECTIONS) {
      const fileName = path.join(schemaPath, section + '.js');
      const schema = await loadSchema(fileName);
      const checkResult = schema.check(config[section]);
      if (!checkResult.valid) {
        for (const err of checkResult.errors) {
          console.error(`${err} in application/config/${section}.js`);
        }
        valid = false;
      }
    }
    if (!valid) exit();
  };

  const context = metavm.createContext({ process });
  const options = { mode: process.env.MODE, context };
  const config = await new Config(CFG_PATH, options).catch((err) => {
    exit(`Can not read configuration: ${CFG_PATH}\n${err.stack}`);
  });
  await validateConfig(config);
  const { balancer, ports = [], workers = {} } = config.server;
  const serversCount = ports.length + (balancer ? 1 : 0);
  const schedulerCount = 1;
  const schedulerId = serversCount;
  const poolSize = workers.pool || 0;
  const count = serversCount + schedulerCount + poolSize;
  let startTimer = null;
  let active = 0;
  let starting = 0;
  const threads = new Array(count);
  const pool = new metautil.Pool({ timeout: workers.wait });

  const stop = async () => {
    for (const worker of threads) {
      worker.postMessage({ type: 'event', name: 'stop' });
    }
  };

  let scheduler = null;
  const start = (id) => {
    const workerPath = path.join(__dirname, 'lib/worker.js');
    const worker = new Worker(workerPath, { trackUnmanagedFds: true });
    threads[id] = worker;
    if (id === schedulerId) scheduler = worker;
    else if (id > schedulerId) pool.add(worker);

    worker.on('exit', (code) => {
      active--;
      if (code !== 0) start(id);
      else if (active === 0) process.exit(0);
      else if (active < 0 && id === 0) exit();
    });

    worker.on('online', () => {
      if (++starting === count) {
        startTimer = setTimeout(() => {
          if (active !== count) console.warn('Server initialization timed out');
        }, config.server.timeouts.start);
      }
    });

    const ITC = {
      event: ({ name }) => {
        if (name !== 'started') return;
        active++;
        if (active === count && startTimer) {
          clearTimeout(startTimer);
          startTimer = null;
        }
      },

      task: (msg) => {
        if (msg.type !== 'task') return;
        const transferList = msg.port ? [msg.port] : undefined;
        scheduler.postMessage(msg, transferList);
      },

      invoke: async (msg) => {
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
      },
    };

    worker.on('message', (msg) => {
      const handler = ITC[msg.type];
      if (handler) handler(msg);
    });
  };

  for (let id = 0; id < count; id++) start(id);

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => {
      const key = data[0];
      if (key === CTRL_C) stop();
    });
  }
})();
