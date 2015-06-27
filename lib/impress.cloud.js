'use strict';

impress.cloud = {};

impress.cloud.status = 'offline'; // sleep, online, offline, error, maintenance

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
    connection.chunks = [];
    connection.packetId = 0;
    impress.cloud.send(connection, 'handshake', 'init', { nodeId: impress.nodeId /*, payload: api.impress.generateKey(5000, impress.ALPHA_DIGIT)*/ });
    connection.on('end', function() {
      // Remove from impress.cloud.controller.connections
    });
    connection.on('data', function(data) {
      console.log('Cloud Controller ' + impress.nodeId + ' received ' + data.toString().length);
      connection.chunks.push(data);
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
  client.chunks = [];
  client.packetId = 0;
  impress.cloud.node.client = client;
  client.on('connect', function() {
    impress.cloud.status = 'online';
    impress.cloud.send(client, 'handshake', 'init', { nodeId: impress.nodeId /*, payload: api.impress.generateKey(5000, impress.ALPHA_DIGIT)*/ });
  });
  client.on('data', function(data) {
    console.log('Cloud Node ' + impress.nodeId + ' received ' + data.toString().length);
    client.chunks.push(data);
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
    id: socket.packetId++,
    type: type,
    name: name,
    data: data
  }) + '\uFFFF\uFFFF';
  //console.log(new Buffer(packet).toString());
  socket.write(packet);
};
