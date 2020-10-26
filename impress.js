'use strict';

process.title = 'impress';

const { Worker } = require('worker_threads');
const path = require('path');

const { Config } = require('@metarhia/config');

const PATH = process.cwd();
const CFG_PATH = path.join(PATH, 'application/config');
const CTRL_C = 3;

(async () => {
  const options = { mode: process.env.MODE };
  const config = await new Config(CFG_PATH, options, ['server']);
  if (!config.server) {
    console.log('Can not read configuration: application/config/server.js');
    process.exit(0);
  }
  const { balancer, ports = [], workers = {} } = config.server;
  const count = ports.length + (balancer ? 1 : 0) + (workers.pool || 0);
  let active = count;
  const threads = new Array(count);

  const start = id => {
    const workerPath = path.join(__dirname, 'lib/worker.js');
    const worker = new Worker(workerPath, { trackUnmanagedFds: true });
    threads[id] = worker;
    worker.on('exit', code => {
      if (code !== 0) start(id);
      else if (--active === 0) process.exit(0);
    });
  };

  for (let id = 0; id < count; id++) start(id);

  const stop = async () => {
    for (const worker of threads) {
      worker.postMessage({ name: 'stop' });
    }
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', data => {
      const key = data[0];
      if (key === CTRL_C) stop();
    });
  }
})();
