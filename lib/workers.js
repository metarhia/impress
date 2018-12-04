'use strict';

// Fork Impress process
//   env - <Object>, environment variables
//   inspect - <boolean>, inspect node.js process
// Returns: <ChildProcess>, node.js process instance
impress.fork = (env, inspect) => {
  const modulePath = process.argv[1];
  const args = process.argv.slice(2);
  const argv = process.execArgv.slice(0);
  if (inspect) {
    argv.push('--inspect=' + inspect);
  }
  const opt = {
    env: Object.assign({}, process.env, env),
    execArgv: argv
  };
  return api.cp.fork(modulePath, args, opt);
};

// Fork new worker
//   workerId <number>
//   server <Object>
//   inspect <boolean> inspect node.js process
impress.forkWorker = (workerId, server, inspect) => {
  const env = {
    WORKER_ID: workerId + 1,
    WORKER_TYPE: 'server',
    WORKER_SERVER_NAME: server.name,
    WORKER_SERVER_PROTO: server.config.protocol,
  };
  impress.nextWorkerId++;
  const worker = impress.fork(env, inspect);
  worker.workerId = workerId;
  worker.nodeId = impress.config.sections.scale.server + 'N' + (workerId + 1);
  impress.stat.fork++;
  impress.workers[workerId] = worker;
  worker.on('exit', code => {
    impress.stat.fork--;
    delete impress.workers[workerId];
    if (code > 0) {
      setImmediate(() => {
        impress.forkWorker(workerId, server, inspect);
      });
    }
  });
  impress.listenWorker(worker);
};

// Kill all forked workers with SIGTERM
impress.killWorkers = () => {
  for (const workerId in impress.workers) {
    const worker = impress.workers[workerId];
    worker.kill();
    delete impress.workers[workerId];
  }
};

// Fork Long Worker
//   appName <string> application name to run worker in application context
//   workerFile <string> filename with path
//   clientData <string> JSON serialized client request data
impress.forkLongWorker = (appName, workerFile, clientData) => {
  if (impress.isMaster) {
    const workerId = impress.nextWorkerId++;
    const env = {
      WORKER_ID: workerId,
      WORKER_TYPE: 'long',
      WORKER_FILE: workerFile,
      WORKER_APPNAME: appName,
      WORKER_CLIENT: clientData
    };
    const nodeId = impress.config.sections.scale.server + 'L' + workerId;
    const worker = impress.fork(env);
    worker.workerId = workerId;
    worker.file = workerFile;
    worker.nodeId = nodeId;
    impress.listenWorker(worker);
    impress.workers[workerId] = worker;
    impress.longWorkers[workerId] = worker;
    impress.stat.fork++;
    worker.on('exit', (/*code, signal*/) => {
      impress.retranslateEvent(-1, {
        name: 'impress:exitlongworker',
        appName, nodeId
      });
      impress.stat.fork--;
      delete impress.longWorkers[workerId];
      delete impress.workers[workerId];
    });
    return worker;
  } else {
    process.send({
      name: 'impress:forklongworker',
      appName, workerFile, clientData
    });
  }
};

// Kill Long Worker
//  appName <string> application name
//  workerFile <string>  filename with path
//  nodeId <number> kill worker by id
impress.killLongWorker = (appName,  workerFile, nodeId) => {
  if (impress.isMaster) {
    for (const workerId in impress.longWorkers) {
      const worker = impress.longWorkers[workerId];
      if (
        worker.file === workerFile &&
        (!nodeId || worker.nodeId === nodeId)
      ) {
        worker.emit('exit', worker);
        worker.removeAllListeners('exit');
        impress.log.system('Kill ' + worker.pid + '/' + worker.nodeId);
        worker.kill();
        delete impress.workers[workerId];
        delete impress.longWorkers[workerId];
        impress.stat.fork++;
      }
    }
  } else {
    process.send({
      name: 'impress:killlongworker', appName, workerFile
    });
  }
};

// Initialize IPC from workers to master
//   worker <ChildProcess> worker instance
impress.listenWorker = worker => {
  worker.on('message', message => {
    if (message.name === 'impress:exit') {
      impress.fatalError(message.error);
    }
    if (message.name === 'impress:start') {
      impress.serversStarted++;
      if (impress.serversStarted >= impress.serversCount) {
        impress.emit('started');
      }
    } else if (message.name === 'impress:forklongworker') {
      const longWorker = impress.forkLongWorker(
        message.appName, message.workerFile, message.clientData
      );
      message.pid = longWorker.pid;
      message.nodeId = longWorker.nodeId;
      impress.retranslateEvent(-1, message);
      delete message.name;
    } else if (message.name === 'impress:killlongworker') {
      impress.killLongWorker(message.appName, message.workerFile);
    }
  });
};
