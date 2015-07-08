'use strict';

//console.log('transport: ipc');

impress.cloud.transport = {};

// TODO: when worker crashes is should be replaces in connection list

// Wrap IPC to emulate server socket
//
impress.cloud.transport.createServer = function() {
  //console.log('impress.cloud.transport.createServer in '+impress.nodeId);
  var server = new api.events.EventEmitter();
  setImmediate(function() {
    var socket, worker;
    for (var workerId in api.cluster.workers) {
      worker = api.cluster.workers[workerId];
      if (!worker.suicide) {
        //console.log('  create socket and emit connection');
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
  //console.log('impress.cloud.transport.createClient in '+impress.nodeId);
  var client = new api.events.EventEmitter();
  client.process = process;
  impress.cloud.transport.upgradeSocket(client);
  return client;
};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {

  //console.log('impress.cloud.transport.upgradeSocket in '+impress.nodeId);

  // Send packet to socket
  //
  socket.sendPacket = function(packet) {
    //console.log('socket.sendPacket in '+impress.nodeId);
    socket.process.send(packet);
    return packet.id;
  };

  socket.process.on('message', function(packet) {
    socket.emit('packet', packet);
  });

};
