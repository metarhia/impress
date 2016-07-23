'use strict';

global.api = {};
api.common = {};
api.jstp = {};

var dir = process.cwd();

api.vm = require('vm');
api.net = require('net');
api.tls = require('tls');
api.util = require('util');
api.events = require('events');
require(dir + '/lib/api.common.js');
require(dir + '/lib/api.jstp.js');

var port, tls;
if (process.argv.indexOf('--tls') !== -1) {
  port = 4000;
  tls = true;
} else {
  port = 3000;
  tls = false;
}

var connection = api.jstp.connect('impress', '127.0.0.1', port, tls);

connection.on('connect', function() {
  console.log('connected');
  connection.handshake('example', 'user', 'passwordHash', function(err, session) {
    if (err) throw err;
    console.log('handshake done, sid =', session);
    connection.inspect('interfaceName', runTests);
  });
});

function runTests(err, interfaceName) {
  if (err) throw err;

  interfaceName.on('eventName', function(args) {
    console.log('Got event, data:', args);
  });

  interfaceName.methodName(1, 2, 3, function(err, res) {
    if (err) throw err;
    console.log('result1 received');
    console.dir(res);
  });

  interfaceName.sendEvent(function(err) {
    if (err) throw err;
  });

  interfaceName.methodName(4, 5, 6, function(err, res) {
    if (err) throw err;
    console.log('result2 received');
    console.dir(res);
    interfaceName.methodName(7, 8, 9, function(err, res) {
      if (err) throw err;
      console.log('result3 received');
      console.dir(res);
      process.exit(0);
    });
  });
}
