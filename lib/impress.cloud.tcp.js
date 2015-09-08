'use strict';

// Cloud RPC TCP transport for Impress Application Server
//
impress.cloud.transport = {};

var PACKET_DELIMITER = '\t\n\r,\t\t\n\n\r\r\t\t\t\n\n\n\r\r\r',
    DELIMITER_LENGTH = PACKET_DELIMITER.length,
    CHUNKS_FIRST = new Buffer('['),
    CHUNKS_LAST = new Buffer(']'),
    RECONNECT_TIMEOUT = 5000;

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
      if (api.cluster.isMaster) impress.log.warning('Connection to Impress Cloud Conntroller lost, reconnecting...');
      impress.cloud.status = 'offline';
      setTimeout(impress.cloud.init, RECONNECT_TIMEOUT);
    }
  });
  return client;
};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {

  socket.chunks = [CHUNKS_FIRST];

  // Send packet to socket
  //
  socket.sendPacket = function(packet) {
    socket.write(JSON.stringify(packet) + PACKET_DELIMITER);
    return packet.id;
  };

  // Return Array of parsed packets and clears socket.chunks
  // if socket.chunks contains complete packet(s), otherwise return null
  //
  socket.receivePacket = function() {
    var arr = null;
    if (socket.chunks && socket.chunks.length) {
      var chunks = socket.chunks,
          buf = chunks[chunks.length - 1],
          delimiter = buf.toString('utf8', buf.length - DELIMITER_LENGTH, buf.length);
      if (delimiter === PACKET_DELIMITER) {
        socket.chunks = [CHUNKS_FIRST];
        buf.fill(' ', buf.length - DELIMITER_LENGTH, buf.length);
        chunks.push(CHUNKS_LAST);
        arr = JSON.parse(Buffer.concat(chunks));
      }
    }
    return arr;
  };

  // On receive data from socket
  //
  socket.on('data', function(data) {
    socket.chunks.push(data);
    var arr = socket.receivePacket();
    if (arr) arr.map(function(packet) {
      socket.emit('packet', packet);
    });
  });

};
