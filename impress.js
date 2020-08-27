'use strict';

process.title = 'impress';

const { Worker } = require('worker_threads');
const path = require('path');

const Config = require('@metarhia/config');

const PATH = process.cwd();
const CFG_PATH = path.join(PATH, 'application/config');
const CTRL_C = 3;
const options = { trackUnmanagedFds: true };

(async () => {
  const config = await new Config(CFG_PATH);
  const { pool } = config.sections.server.workers;
  const balancer = config.sections.server.balancer ? 1 : 0;
  const count = config.sections.server.ports.length + balancer + pool;
  let active = count;
  const workers = new Array(count);

  const start = id => {
    const workerPath = path.join(__dirname, 'lib/worker.js');
    const worker = new Worker(workerPath, options);
    workers[id] = worker;
    worker.on('exit', code => {
      if (code !== 0) start(id);
      else if (--active === 0) process.exit(0);
    });
  };

  for (let id = 0; id < count; id++) start(id);

  const stop = async () => {
    for (const worker of workers) {
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
