'use strict';

// Cloud RPC ZeroMQ transport for Impress Application Server
//

api.zmq = api.impress.require('zmq');

impress.cloud.transport = {};

// Wrap ZMQ to emulate server socket
//
impress.cloud.transport.createServer = function() {

  var uri = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.rpcPort;
  var server = api.zmq.socket('router');
  server.identity = impress.nodeId;
  impress.cloud.transport.upgradeSocket(server);

  server.bind(uri, function(err) {
    if (err) throw err;
    server.on('message', function(envelope, data) {
      var socket = impress.cloud.connections[envelope];
      if (socket) socket.emit('packet', JSON.parse(data));
      else {
        socket = new api.events.EventEmitter();
        socket.remoteNodeId = envelope;
        impress.cloud.transport.upgradeSocket(socket);
        server.emit('connection', socket);
        socket.emit('packet', JSON.parse(data));
      }
    });
  });

  return server;
  
};

// Wrap ZMQ to emulate client socket
//
impress.cloud.transport.createClient = function() {

  var uri = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.rpcPort;
  var client = api.zmq.socket('dealer');
  client.identity = impress.nodeId;
  client.connect(uri);
  impress.cloud.transport.upgradeSocket(client);

  client.on('message', function(data) {
    client.emit('packet', JSON.parse(data));
  });

  return client;

};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {
  
  // Send packet to socket
  //
  socket.sendPacket = function(packet) {
    var buf = JSON.stringify(packet);
    if (impress.cloud.role === 'server') impress.cloud.server.send([socket.remoteNodeId, buf]);
    else socket.send(buf);
    return packet.id;
  };

};
