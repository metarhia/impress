'use strict';

var net = require('net');
var client = net.connect({ port: 81 }, function() {
  console.log('connected to server!');
  client.write('{handshake:[1,\'app\'],A1B2C3D4:[\'hash\']}');
});

client.on('data', function(data) {
  console.log(data.toString());
  client.end();
});
