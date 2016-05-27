'use strict';

global.api = {};
api.common = {};
api.jstp = {};

var dir = process.cwd();

require(dir + '/lib/api.common.js');
require(dir + '/lib/api.jstp.js');
api.net = require('net');
api.vm = require('vm');

var сonnection = api.jstp.connect('impress', '127.0.0.1', 81);

setTimeout(function() {

  console.log('connecting');
  сonnection.handshake('example', 'user', 'passwordHash', function(res) {
    console.log('handshake done');
    console.dir(res);
    сonnection.call('interfaceName', 'methodName', [1, 2, 3], function(res) {
      console.log('result received');
      console.dir(res);
      process.exit(0);
    });
  });

}, 2000);
