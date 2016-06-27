'use strict';

var dir = process.cwd();
require(dir + '/lib/impress');

var ncp = require('ncp').ncp,
    querystring = require('querystring'),
    taskCount = 0;

ncp.limit = 16;

var config = {
  host:    '127.0.0.1',
  port:    8080,
  timeout: 10000,
  tasks: [
    {  get: '/' },
    {  get: '/examples/simple/ajaxTest.ajax' },
    {  get: '/examples/simple/dataFromMemory.json' },
    {  get: '/examples/simple/fsAccess.json' },
    {  get: '/examples/simple/sysInfo.json' },
    {  get: '/examples/simple/lazyHandler.json' },
    {  get: '/examples/simple/endHandler.json' },
    {  get: '/examples/memory/stateful.json' },
    {  get: '/examples/override/' },
    {  get: '/examples/tools/forkWorker.json' },
    {  get: '/examples/tools/serverHealth.json' },
    {  get: '/examples/simple/httpRequest.json' },
    {  get: '/examples/security/anonymousSession.json' },
    {  get: '/examples/security/userInfo.json' },
    {  get: '/examples/tools/longWorker.json/' },
    {  get: '/examples/tools/serverHealth.json' },
    {  get: '/examples/simple/virtualPath.json/a/b/c' },
    {  get: '/examples/simple/jsonGet.json?field=value' },
    {  get: '/examples/middleware/getHandler.json' },
    {  get: '/examples/cache/htmlPage.ajax' },
    {  get: '/examples/cache/apiMethod.json' },
    {  get: '/examples/events/connect.sse' },
//  {  get: '/examples/events/sendEvent.json' },
    {  get: '/examples/simple/csvStringify.csv' },
    {  get: '/examples/simple/jsonpGet.jsonp', data: { callback: 'callbackFunctionName' } },
    { post: '/examples/simple/jsonPost.json', data: { parameterName:'value' } },
  ]
};

function taskExit() {
  taskCount--;
  if (taskCount === 0) impress.shutdown();
}

function httpTask(task) {
  taskCount++;
  var request = {
    host: config.host,
    port: config.port,
    agent: false
  };
  if (task.get) {
    request.method = 'GET';
    request.path = task.get;
  } else if (task.post) {
    request.method = 'POST';
    request.path = task.post;
  }
  if (task.data) {
    task.data = querystring.stringify(task.data);
    request.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': task.data.length
    };
  }
  if (request.path) {
    var req = api.http.request(request);
    req.on('response', function (res) {
      if (res.statusCode === 200) {
        var msg = 'Request: http://' + config.host + ':' + config.port + ' ' + request.method + ' ' + request.path +
            ' -> HTTP ' + res.statusCode + ' read: '+res.socket.bytesRead;
        console.log('  ' + msg);
        res.on('error', function (err) {
          if (err) throw err;
        });
      } else {
        console.log(('Error: ' + request.method + ' ' + request.path).bold.red);
        throw new Error('HTTP ' + res.statusCode);
      }
      taskExit();
    });
    req.on('error', function (err) {
      if (err) throw err;
      taskExit();
    });
    if (task.data) req.write(task.data);
    req.end();
  }
}

if (process.isMaster) {
  console.log('Testing IAS...'.bold.green);
  impress.server.start();
  impress.server.on('start', function() {
    setTimeout(function() {
      //api.impress.logApiMethod('fs.stat');
      for (var i = 0; i < config.tasks.length; i++) httpTask(config.tasks[i]);
    }, 500);
  });
} else {
  impress.server.start();
}
