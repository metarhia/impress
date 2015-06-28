'use strict';

impress.cloud = new api.events.EventEmitter();

impress.cloud.status = 'offline'; // sleep, online, offline, error, maintenance

var PACKET_DELIMITER = '\t\n\r,\t\t\n\n\r\r\t\t\t\n\n\n\r\r\r',
    DELIMITER_LENGTH = PACKET_DELIMITER.length,
    CHUNKS_FIRST = new Buffer('['),
    CHUNKS_LAST = new Buffer(']'),
    PACKET_TYPES = [ 'handshake', 'introspection', 'call', 'callback', 'event', 'state', 'health' ];

// Init Connection
//
impress.cloud.init = function() {
  if (impress.config.scale) {
    if (api.cluster.isWorker) impress.cloud.init.node();
    else if (impress.config.scale.instance === 'controller') impress.cloud.init.controller();
    else impress.cloud.init.cluster();
  }
};

// Initialize Impress Cloud Controller
//
impress.cloud.init.controller = function() {
  var server = api.net.createServer();
  impress.cloud.server = server;
  impress.cloud.connections = [];
  server.listen(impress.config.scale.port, impress.config.scale.host);
  server.on('listening', function() {
    impress.cloud.status = 'online';
  });
  server.on('connection', function(socket) {
    impress.cloud.upgradeSocket(socket);
    socket.on('packet', function(packet) {
      console.log('Controller received packet:');
      console.dir(packet);
    });
    socket.send('handshake');
    socket.on('end', function() {
      // Remove from impress.cloud.controller.connections
    });
  });
  server.on('error', function(e) {
    console.error(e);
  });
};

// Initialize Impress Cloud Cluster
//
impress.cloud.init.cluster = function() {
  impress.cloud.init.node();
};

// Initialize Impress Cloud Node
//
impress.cloud.init.node = function() {
  var socket = api.net.connect(impress.config.scale.port, impress.config.scale.host);
  impress.cloud.upgradeSocket(socket);
  impress.cloud.client = socket;
  socket.on('connect', function() {
    impress.cloud.status = 'online';
    socket.send('handshake');
  });
  socket.on('packet', function(packet) {
    console.log('Node received packet:');
    console.dir(packet);
  });
  socket.on('end', function() {
    console.log('Node ' + impress.nodeId + ' disconnected from Impress Cloud, reconnecting...');
    impress.cloud.init.node();
  });
};

// Upgrade socket mixin RPC methods
//
impress.cloud.upgradeSocket = function(socket) {

  socket.chunks = [ CHUNKS_FIRST ];
  socket.calls = {};
  socket.packetId = 0;

  // Send data to socket
  //   type - packet type: one of PACKET_TYPES
  //   name - target method or event name (optional)
  //   data - payload (optional)
  //   id - use certain packet id (optional)
  //
  socket.send = function(type, name, data, id) {
    if (!id && type === 'call') id = socket.packetId++;
    var packet = JSON.stringify({
      id: id,
      from: impress.nodeId,
      type: type,
      name: name,
      data: data
    }) + PACKET_DELIMITER;
    socket.write(packet);
    return id;
  };

  // Return Array of parsed packets and clears socket.chunks
  // if socket.chunks contains complete packet(s), otherwise return null
  //
  socket.receive = function() {
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
    console.log('Instance ' + impress.nodeId + ' received ' + data.toString().length);
    socket.chunks.push(data);
    var arr = socket.receive();
    if (arr) arr.map(function(packet) {
      socket.emit('packet', packet);
    });
  });

  // On receive packet from socket
  //
  socket.on('packet', function(packet) {
    var method = methods[packet.type];
    if (method) method(packet);
  });

  // Packet type handlers
  //
  var methods = {
    handshake: function(packet) {
      // Implement handshake
    },
    call: function(packet) {
      // Implement call to IAS handlers
      // stub:
      socket.send('callback', undefined, { result: true }, packet.id);
    },
    callback: function(packet) {
      var cb = socket.calls[packet.id];
      if (cb && cb.callback) cb.callback(packet.data);
    },
    event: function(packet) {
      impress.cloud.emit('event', packet);
    },
    state: function(packet) {
    },
    health: function(packet) {
    }
  };

  // Call remote method
  //
  socket.call = function(name, data, callback) {
    var id = socket.send('call', name, data);
    socket.calls[id] = { id: id, callback: callback };
  };

};

/*
socket.call('method1', {}, function(res) {
  console.log('callback from method1');
  console.dir(res);
});
*/
