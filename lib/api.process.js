'use strict';

// Process utilities for Impress Application Server

api.process = process;

api.process.isWin = !!process.platform.match(/^win/);

api.process.isWorker = ('WORKER_SERVER_NAME' in process.env);

api.process.isMaster = !api.process.isWorker;

api.process.fork = function(env) {
  return api.cp.fork(process.cwd() + '/server.js', [], {
   env: Object.assign(process.env, env)
  });
};

api.process.workers = {};
