'use strict';

console.log('transport: zmq');

var zmq = require('zmq');

impress.cloud.transport = {};

// Wrap ZMQ to emulate server socket
//
impress.cloud.transport.createServer = function() {

  console.log('impress.cloud.transport.createServer in '+impress.nodeId);

  var uri = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.port;
  var server = zmq.socket('router');
  server.identity = impress.nodeId;

  server.bind(uri, function(err) {
    if (err) throw err;
    console.log('bound!');

    server.on('message', function(envelope, data) {
      console.log('Received by:' + server.identity + ' envelope:' + envelope + ' data:' + data.toString());
      server.emit('packet', JSON.parse(data));
    });
  });

  impress.cloud.transport.upgradeSocket(server);
  return server;
  
};

// Wrap ZMQ to emulate client socket
//
impress.cloud.transport.createClient = function() {

  console.log('impress.cloud.transport.createClient in '+impress.nodeId);

  var uri = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.port;
  var client = zmq.socket('dealer');
  client.identity = impress.nodeId;
  client.connect(uri);

  client.on('message', function(data) {
    console.log(client.identity + ': answer data ' + data);
  });

  impress.cloud.transport.upgradeSocket(client);
  return client;

};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {
  
  // Send packet to socket
  //
  socket.sendPacket = function(type, name, data, id) {
    console.log('socket.sendPacket in '+impress.nodeId);
    var packet = socket.packet(type, name, data, id),
        buf = JSON.stringify(packet);
    /*if (impress.config.scale.instance === 'controller') socket.send([id, buf]);
    else*/ socket.send(buf);
    return packet.id;
  };

};
