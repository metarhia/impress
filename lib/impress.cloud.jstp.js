'use strict';

// Cloud RPC TCP transport for Impress Application Server
//
impress.cloud.transport = {};

var RECONNECT_TIMEOUT = 5000;

// Server TCP socket
//
impress.cloud.transport.createServer = function() {
  var server = api.net.createServer();
  server.listen(impress.config.scale.rpcPort, impress.config.scale.host);
  server.on('connection', function(socket) {
    socket.on('error', function(/*err*/) { });
    impress.cloud.transport.upgradeSocket(socket);
  });
  impress.setListenerError(server, impress.config.scale.host + ':' + impress.config.scale.rpcPort);
  return server;
};

// Client TCP socket
//
impress.cloud.transport.createClient = function() {
  var client = api.net.connect(impress.config.scale.rpcPort, impress.config.scale.host);
  impress.cloud.transport.upgradeSocket(client);
  client.on('error', function(err) {
    if (impress.cloud.status === 'online') {
      impress.cloud.status = 'offline';
      impress.cloud.init();
    } else if (err.code === 'ECONNREFUSED') {
      if (api.cluster.isMaster) {
        impress.log.warning('Connection to Impress Cloud Conntroller lost, reconnecting...');
      }
      impress.cloud.status = 'offline';
      setTimeout(impress.cloud.init, RECONNECT_TIMEOUT);
    }
  });
  return client;
};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {

  socket.chunks = new api.jstp.Chunks();

  // Send packet to socket
  //
  socket.sendPacket = function(packet) {
    socket.write(api.jstp.stringify(packet) + api.jstp.PACKET_DELIMITER);
    return packet.id;
  };

  // On receive data from socket
  //
  socket.on('data', function(data) {
    var packets = socket.chunks.add(data);
    if (packets) {
      packets = api.jstp.removeDelimiters(packets);
      packets = packets.concat(packets);
      packets.map(function(packet) {
        socket.emit('packet', packet);
      });
    }
  });

};
