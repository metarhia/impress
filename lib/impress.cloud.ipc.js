'use strict';

// Cloud RPC IPC transport for Impress Application Server
//
impress.cloud.transport = {};

// Wrap IPC to emulate server socket
//
impress.cloud.transport.createServer = function() {
  var server = new api.events.EventEmitter();
  setImmediate(function() {
    var socket, worker;
    for (var workerId in api.cluster.workers) {
      worker = api.cluster.workers[workerId];
      if (!worker.suicide) {
        socket = new api.events.EventEmitter();
        socket.process = worker;
        impress.cloud.transport.upgradeSocket(socket);
        server.emit('connection', socket);
      }
    }
  });
  return server;
};

// Wrap IPC to emulate server socket
//
impress.cloud.transport.createClient = function() {
  var client = new api.events.EventEmitter();
  client.process = process;
  impress.cloud.transport.upgradeSocket(client);
  return client;
};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {

  // Send packet to socket
  //
  socket.sendPacket = function(packet) {
    socket.process.send(packet);
    return packet.id;
  };

  socket.process.on('message', function(packet) {
    socket.emit('packet', packet);
  });

};
