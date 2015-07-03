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

    server.on('message', function(envelope, data) {
      console.log('---Add envelope:'+envelope);
      if (impress.cloud.connections.length < 4) {
        var socket = new api.events.EventEmitter();
        socket.envelope = envelope;
        server.emit('connection', socket);
        impress.cloud.transport.upgradeSocket(socket);
      } else {
        var socket;
        //console.log('impress.cloud.connections.length:'+impress.cloud.connections.length);
        for (var i = 0, len = impress.cloud.connections.length; i < len; i++) {
          socket = impress.cloud.connections[i];
          //console.log('socket.envelope:'+socket.envelope+' === envelope:'+envelope);
          if (socket.envelope === envelope) break;
        }
      }
      if (socket) {
        console.log('------Found envelope:'+envelope);
        socket.emit('packet', JSON.parse(data));
      }
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
    client.emit('packet', JSON.parse(data));
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
    if (api.cluster.isMaster && impress.config.scale.instance === 'controller') {
      impress.cloud.server.send([socket.envelope, buf]);
    } else socket.send(buf);
    return packet.id;
  };

};
