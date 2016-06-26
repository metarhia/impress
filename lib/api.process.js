'use strict';

// Process utilities for Impress Application Server

api.process = process;

api.process.isWin = !!process.platform.match(/^win/);

api.process.isWorker = ('WORKER_SERVER_NAME' in process.env);

api.process.isMaster = !api.process.isWorker;

api.process.fork = function(env) {
  var modulePath = api.process.argv[1],
      args = api.process.argv.slice(2);
  var opt = {
   env: Object.assign(api.process.env, env)
  };
  return api.cp.fork(modulePath, args, opt);
};

api.process.workers = {};
