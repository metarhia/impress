'use strict';

impress.cloud = {};

impress.cloud.status = 'offline'; // sleep, online, offline, error, maintenance

var PACKET_DELIMITER = '\t\n\r,\t\t\n\n\r\r\t\t\t\n\n\n\r\r\r',
    DELIMITER_LENGTH = PACKET_DELIMITER.length,
    CHUNKS_FIRST = new Buffer('['),
    CHUNKS_LAST = new Buffer(']'),
    PACKET_TYPES = [ 'handshake', 'call', 'return', 'callback', 'event', 'state', 'health' ],
    REQUIRES_ID = [ 'call', 'return', 'callback' ];

// Init Connection
//
impress.cloud.init = function() {
  if (impress.config.scale) {
    if (impress.config.scale.instance === 'controller') {
      if (api.cluster.isMaster) impress.cloud.controller();
      else impress.cloud.node();
    } else if (impress.config.scale.instance === 'server') {
      if (api.cluster.isMaster) impress.cloud.cluster();
      else impress.cloud.node();
    }
  }
};

// Initialize Impress Cloud Controller
//
impress.cloud.controller = function() {
  var server = api.net.createServer();
  impress.cloud.controller.server = server;
  impress.cloud.controller.connections = [];
  server.listen(impress.config.scale.port, impress.config.scale.host);
  server.on('listening', function() {
    impress.cloud.status = 'online';
  });
  server.on('connection', function(connection) {
    connection.chunks = [ CHUNKS_FIRST ];
    connection.packetId = 0;
    impress.cloud.send(connection, 'handshake');
    connection.on('end', function() {
      // Remove from impress.cloud.controller.connections
    });
    connection.on('data', function(data) {
      console.log('Cloud Controller ' + impress.nodeId + ' received ' + data.toString().length);
      connection.chunks.push(data);
      var arr = impress.cloud.read(connection);
      if (arr) arr.map(function(packet) {
        console.log('Cloud Controller received packet: ');
        console.dir(packet);
      });
    });
  });
  server.on('error', function(e) {
    console.error(e);
  });
};

// Initialize Impress Cloud Cluster
//
impress.cloud.cluster = function() {
  impress.cloud.node();
};

// Initialize Impress Cloud Node
//
impress.cloud.node = function() {
  var client = api.net.connect(impress.config.scale.port, impress.config.scale.host);
  client.chunks = [ CHUNKS_FIRST ];
  client.packetId = 0;
  impress.cloud.node.client = client;
  client.on('connect', function() {
    impress.cloud.status = 'online';
    impress.cloud.send(client, 'handshake');
  });
  client.on('data', function(data) {
    console.log('Cloud Node ' + impress.nodeId + ' received ' + data.toString().length);
    client.chunks.push(data);
    var arr = impress.cloud.read(client);
    if (arr) arr.map(function(packet) {
      console.log('Cloud Node received packet: ');
      console.dir(packet);
    });
  });
  client.on('end', function() {
    console.log('Node ' + impress.nodeId + ' disconnected from Impress Cloud, reconnecting...');
    impress.cloud.node();
  });
};

// Send data to socket
//
impress.cloud.send = function(socket, type, name, data) {
  var packet = JSON.stringify({
    id: REQUIRES_ID.indexOf(type) > -1 ? socket.packetId++ : undefined,
    from: impress.nodeId,
    type: type,
    name: name,
    data: data
  }) + PACKET_DELIMITER;
  socket.write(packet);
};

// Return Array of parsed packets and clears socket.chunks
// if socket.chunks contains complete packet(s), otherwise return null
//
impress.cloud.read = function(socket) {
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
