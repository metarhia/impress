'use strict';

const ncp = require('ncp').ncp;
const querystring = require('querystring');
const metatests = require('metatests');

ncp.limit = 16;

let taskCount = 0;

const config = {
  host: '127.0.0.1',
  port: 8080,
  timeout: 10000,
  tasks: [
    { get: '/' },
    { get: '/examples/simple/ajaxTest.ajax' },
    { get: '/examples/simple/dataFromMemory.json' },
    { get: '/examples/simple/fsAccess.json' },
    { get: '/examples/simple/sysInfo.json' },
    { get: '/examples/memory/stateful.json' },
    { get: '/examples/tools/forkWorker.json' },
    { get: '/examples/tools/serverHealth.json' },
    { get: '/examples/security/anonymousSession.json' },
    { get: '/examples/security/userInfo.json' },
    { get: '/examples/tools/longWorker.json/' },
    { get: '/examples/tools/serverHealth.json' },
    { get: '/examples/simple/virtualPath.json/a/b/c' },
    { get: '/examples/simple/jsonGet.json?field=value' },
    { get: '/examples/cache/apiMethod.json' },
    { get: '/examples/events/sendEvent.json' },
    { get: '/examples/simple/csvStringify.csv' },
    {
      post: '/examples/simple/jsonPost.json',
      data: { parameterName: 'value' }
    }
  ]
};

const getRequest = task => {
  const request = {
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
  return request;
};

config.tasks.forEach(task => {
  const name = task.get || task.post;
  metatests.test('http request of ' + name, test => {
    const request = getRequest(task);
    if (!request.path) {
      test.bailout();
    }

    const req = api.http.request(request);
    req.on('response', res => {
      test.strictSame(res.statusCode, 200);
      test.end();
    });
    req.on('error', err => {
      test.bailout(err);
    });
    if (task.data) req.write(task.data);
    req.end();
  });
});
