"use strict";

require('./lib/impress');

if (api.cluster.isMaster) {

  var ncp = require('ncp').ncp;
  var querystring = require('querystring');
  //  request = require('request').defaults({jar: false});

  ncp.limit = 16;

  var config = {
    host:   '127.0.0.1',
    port:    8080,
    timeout: 5000,
    tasks: [
      {  get: '/' },
      {  get: '/examples/simple/ajaxTest.ajax' },
      {  get: '/examples/simple/dataFromMemory.json' },
      {  get: '/examples/simple/fsAccess.json' },
      {  get: '/examples/simple/sysInfo.json' },
      {  get: '/examples/memory/stateful.json' },
      {  get: '/examples/override/' },
      {  get: '/examples/tools/forkWorker.json' },
      {  get: '/examples/tools/serverHealth.json' },
      {  get: '/examples/simple/httpRequest.json' },
      {  get: '/examples/security/anonymousSession.json' },
      {  get: '/examples/security/userInfo.json' },
      {  get: '/examples/tools/forkWorker.json/' },
      {  get: '/examples/tools/serverHealth.json' },
      {  get: '/examples/simple/virtualPath.json/a/b/c' },
      {  get: '/examples/simple/jsonGet.json?field=value' },
      {  get: '/examples/cache/htmlPage.ajax' },
      {  get: '/examples/cache/apiMethod.json' },
      { post: '/examples/simple/jsonPost.json', data: { parameterName:'value' } },
    ]
  };

  var current = api.path.dirname(__filename.replace(/\\/g, '/')),
    destination = current+'/',
    source = current+'/examples/',
    exists = false;

  api.async.each(['config', 'applications'], function(file, callback) {
    api.fs.exists(destination+file, function(fileExists) {
      exists = exists || fileExists;
      callback();
    });
  }, function(err) {
    if (err) throw err;
    if (exists) {
      console.log('Impress Application Server'.bold.green+' is already installed and configured in this folder.');
      console.log('  Current config and applications will be used for tests');
      httpTests();
    } else {
      console.log('Installing config and examples...'.bold.green);
      ncp(source+'copyConfigForTestsOnly/config', destination+'config', { clobber: false }, function (err) {
        if (err) throw err;
        ncp(source+'copyContentToProjectFolder/applications', destination+'applications', { clobber: false }, function (err) {
          if (err) throw err;
          httpTests();
        });
      });
    }
  });

}

function httpTests() {
  impress.server.start();
  impress.server.on('start', function() {
    for (var i = 0; i < config.tasks.length; i++) httpTask(config.tasks[i]);
  });

  setInterval(function() {
    impress.shutdown();
  }, config.timeout);
}

function httpTask(task) {
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
        var msg = 'Request: http://' + config.host + ':' + config.port + ' ' + request.method + ' ' + request.path + ' -> HTTP ' + res.statusCode;
        console.log('  ' + msg);
        res.on('error', function (err) {
          if (err) throw err;
        });
      } else {
        // console.dir(task);
        throw new Error('HTTP ' + res.statusCode);
      }
    });
    req.on('error', function (err) {
      if (err) throw err;
    });
    if (task.data) req.write(task.data);
    req.end();
  }
}
