'use strict';

const wt = require('worker_threads');

const workers = new Map();

// Initialize IPC from workers to master
//   worker <ChildProcess> worker instance
const listenWorker = worker => {
  worker.on('message', message => {
    console.dir({ message });
  });
};

// Fork new worker
//   workerId <number>
//   server <Object>
const forkWorker = (workerId, server) => {
  const args = {
    WORKER_ID: workerId + 1,
    WORKER_TYPE: 'server',
    WORKER_SERVER_NAME: server.name,
    WORKER_SERVER_PROTO: server.config.protocol,
  };
  const modulePath = process.argv[1];
  const worker = new wt.Worker(modulePath, { workerData: args });
  worker.workerId = workerId;
  workers.set(workerId, worker);
  worker.on('exit', code => {
    workers.delete(workerId);
    if (code > 0) {
      setImmediate(() => {
        forkWorker(workerId, server);
      });
    }
  });
  listenWorker(worker);
};

// Kill all forked workers with SIGTERM
const killWorkers = () => {
  for (const worker of workers.values()) {
    worker.terminate();
  }
  workers.clear();
};

// Retranslate IPC event to all workers except one
//   exceptWorkerId <number>
//   event <Object> to retranslate
const retranslateEvent = (exceptWorkerId, event) => {
  for (const [workerId, worker] of workers) {
    if (workerId !== exceptWorkerId) {
      worker.postMessage(event);
    }
  }
};

module.exports = { forkWorker, killWorkers, listenWorker, retranslateEvent };
