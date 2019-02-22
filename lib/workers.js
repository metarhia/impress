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

// Fork Long Worker
//   appName <string> application name to run worker in application context
//   workerFile <string> filename with path
//   clientData <string> JSON serialized client request data
impress.forkLongWorker = (appName, workerFile, clientData) => {
  if (impress.isMaster) {
    const { serverId } = impress;
    const workerId = impress.nextWorkerId++;
    const nodeId = impress.serverId + 'L' + workerId;
    const env = {
      WORKER_ID: workerId,
      WORKER_NODE: nodeId,
      WORKER_SERVER: serverId,
      WORKER_TYPE: 'long',
      WORKER_FILE: workerFile,
      WORKER_APPNAME: appName,
      WORKER_CLIENT: clientData,
    };
    const worker = new ImpressWorker(env);
    impress.listenWorker(worker);
    impress.workers.set(workerId, worker);
    impress.longWorkers.set(workerId, worker);
    impress.stat.fork++;
    worker.process.on('exit', () => {
      impress.retranslateEvent(-1, {
        name: 'impress:exitLongWorker',
        appName, nodeId
      });
      impress.stat.fork--;
      impress.longWorkers.delete(workerId);
      impress.workers.delete(workerId);
    });
    return worker;
  }
  process.send({
    name: 'impress:forkLongWorker',
    appName, workerFile, clientData
  });
};

// Kill Long Worker
//   appName <string> application name
//   workerFile <string>  filename with path
impress.killLongWorker = (appName,  workerFile) => {
  if (impress.isMaster) {
    for (const [workerId, worker] of impress.longWorkers) {
      if (worker.file === workerFile) {
        worker.process.emit('exit');
        worker.process.removeAllListeners('exit');
        impress.log.system(`Kill ${worker.process.pid}/${worker.nodeId}`);
        worker.process.kill();
        impress.workers.delete(workerId);
        impress.longWorkers.delete(workerId);
        impress.stat.fork++;
      }
    }
  } else {
    process.send({
      name: 'impress:killLongWorker', appName, workerFile
    });
  }
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
      if (impress.serversStarted >= impress.serversCount) {
        impress.emit('started');
        const notification = { name: 'impress:startedAllWorkers' };
        impress.retranslateEvent(-1, notification);
      }
    } else if (message.name === 'impress:forkLongWorker') {
      const longWorker = impress.forkLongWorker(
        message.appName, message.workerFile, message.clientData
      );
      message.pid = longWorker.pid;
      message.nodeId = longWorker.nodeId;
      impress.retranslateEvent(-1, message);
      delete message.name;
    } else if (message.name === 'impress:killLongWorker') {
      impress.killLongWorker(message.appName, message.workerFile);
    } else if (message.name === 'impress:testsFinished') {
      impress.emit('testsFinished', message.hasErrors);
    }
  });
};
