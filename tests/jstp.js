'use strict';

var PACKET_DELIMITER = ',[[[\f]]],';
var net = require('net');
var client = net.connect({ port: 81 }, function() {
  console.log('connected to server!');
  client.write('{handshake:[1,\'example\'],A1B2C3D4:[\'hash\']}' + PACKET_DELIMITER);
  client.write('{call:[2,\'interfaceName\'],methodName:[1,2,3]}' + PACKET_DELIMITER);
});

client.on('data', function(data) {
  console.log(data.toString());
  client.end();
});
