'use strict';

process.title = 'impress';

const { Worker } = require('worker_threads');
const path = require('path');

const Config = require('@metarhia/config');

const PATH = process.cwd();
const CFG_PATH = path.join(PATH, 'application/config');

(async () => {
  const config = await new Config(CFG_PATH);
  const { sections } = config;
  const count = sections.server.ports.length;
  const workers = new Array(count);

  const start = id => {
    const workerPath = path.join(__dirname, 'lib/worker.js');
    const worker = new Worker(workerPath);
    workers[id] = worker;
    worker.on('exit', code => {
      if (code !== 0) start(id);
    });
  };

  for (let id = 0; id < count; id++) start(id);

  const stop = async () => {
    console.log();
    for (const worker of workers) {
      worker.postMessage({ name: 'stop' });
    }
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})();
