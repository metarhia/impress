'use strict';

const modulePath = process.argv[1];
const args = process.argv.slice(2);

class ImpressWorker {
  constructor(env) {
    const opt = {
      env: { ...process.env, ...env },
      execArgv: process.execArgv,
    };
    this.process = api.cp.fork(modulePath, args, opt);
    this.workerId = env.WORKER_ID;
    this.nodeId = env.WORKER_NODE;
    this.file = env.WORKER_FILE;
    Object.seal(this.process);
  }
}

// Fork new worker
//   workerId <number>
//   server <Object>
impress.forkWorker = (workerId, server) => {
  impress.nextWorkerId++;
  const { serverId } = impress;
  const nodeId = serverId + 'N' + workerId;
  const env = {
    WORKER_ID: workerId,
    WORKER_NODE: nodeId,
    WORKER_SERVER: serverId,
    WORKER_TYPE: 'server',
    WORKER_SERVER_NAME: server.name,
    WORKER_SERVER_PROTO: server.config.protocol,
  };
  const worker = new ImpressWorker(env);
  impress.stat.fork++;
  impress.workers.set(workerId, worker);
  worker.process.on('exit', code => {
    impress.stat.fork--;
    impress.workers.delete(workerId);
    if (code > 0) {
      setImmediate(() => {
        impress.forkWorker(workerId, server);
      });
    }
  });
  impress.listenWorker(worker);
};

// Kill all forked workers with SIGTERM
impress.killWorkers = () => {
  for (const worker of impress.workers.values()) {
    worker.process.kill(); // SIGTERM
  }
  impress.workers.clear();
};

// Initialize IPC from workers to master
//   worker <ImpressWorker> worker instance
impress.listenWorker = worker => {
  worker.process.on('message', message => {
    if (message.name === 'impress:exit') {
      impress.fatalError(message.error);
    }
    if (message.name === 'impress:start') {
      impress.serversStarted++;
      if (impress.serversStarted === impress.serversCount) {
        impress.emit('started');
        const notification = { name: 'impress:startedAllWorkers' };
        impress.retranslateEvent(-1, notification);
      }
    }
  });
};
