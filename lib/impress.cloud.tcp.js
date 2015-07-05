'use strict';

console.log('transport: tcp');

impress.cloud.transport = {};

var PACKET_DELIMITER = '\t\n\r,\t\t\n\n\r\r\t\t\t\n\n\n\r\r\r',
    DELIMITER_LENGTH = PACKET_DELIMITER.length,
    CHUNKS_FIRST = new Buffer('['),
    CHUNKS_LAST = new Buffer(']');

// Server TCP socket
//
impress.cloud.transport.createServer = function() {
  var server = api.net.createServer();
  server.listen(impress.config.scale.port, impress.config.scale.host);
  server.on('connection', function(socket) {
    impress.cloud.transport.upgradeSocket(socket);
  });
  server.on('error', function(e) {
    console.error(e);
  });
  return server;
};

// Client TCP socket
//
impress.cloud.transport.createClient = function() {
  var client = api.net.connect(impress.config.scale.port, impress.config.scale.host);
  impress.cloud.transport.upgradeSocket(client);
  client.on('end', function() {
    //console.log('Node ' + impress.nodeId + ' disconnected from Impress Cloud, reconnecting...');
    impress.cloud.createClient();
  });
  return client;
};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {

  socket.chunks = [ CHUNKS_FIRST ];

  // Send packet to socket
  //
  socket.sendPacket = function(type, app, name, data, id) {
    var packet;
    if (arguments.length === 1 && typeof(type) === 'object') packet = type;
    else packet = socket.packet(type, app, name, data, id);
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
        socket.chunks = [ CHUNKS_FIRST ];
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
    //console.log('Instance ' + impress.nodeId + ' received ' + data.toString().length);
    socket.chunks.push(data);
    var arr = socket.receivePacket();
    if (arr) arr.map(function(packet) {
      socket.emit('packet', packet);
    });
  });

};
