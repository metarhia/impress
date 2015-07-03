'use strict';

impress.cloud = new api.events.EventEmitter();

impress.cloud.status = 'offline'; // sleep, online, offline, error, maintenance
impress.cloud.STATUSES = [ 'offline', 'sleep', 'online', 'offline', 'error', 'maintenance' ];
impress.cloud.PACKET_TYPES = [ 'handshake', 'introspection', 'call', 'callback', 'event', 'state', 'health' ];
impress.cloud.connections = {};

// Init Connection
//
impress.cloud.init = function() {
  if (impress.config.scale) {
    if (api.cluster.isWorker) impress.cloud.createClient();
    else if (impress.config.scale.instance === 'controller') impress.cloud.createServer();
    else impress.cloud.createClient();
  }
};

// Initialize Impress Cloud Controller
//
impress.cloud.createServer = function() {
  //console.log('impress.cloud.createServer in '+impress.nodeId);
  var server = impress.cloud.transport.createServer();
  impress.cloud.server = server;
  server.on('listening', function() {
    //console.log('impress.cloud.createServer:listening in '+impress.nodeId);
    impress.cloud.status = 'online';
  });
  server.on('connection', function(socket) {
    //console.log('impress.cloud.createServer:connection in '+impress.nodeId);
    impress.cloud.upgradeSocket(socket);
    socket.on('end', function() {
      if (socket.remoteNodeId) delete impress.cloud.connections[socket.remoteNodeId];
    });
  });

  // Send packet to all clients
  //   packet - packet to send
  //   except - not send to nodeId (optional)
  //
  server.broadcast = function(packet, except) {
    var socket;
    for (var nodeId in impress.cloud.connections) {
      socket = impress.cloud.connections[nodeId];
      socket.sendPacket(packet);
    }
  };

};

// Initialize Impress Cloud Node
//
impress.cloud.createClient = function() {
  //console.log('impress.cloud.createClient in '+impress.nodeId);
  var socket = impress.cloud.transport.createClient();
  impress.cloud.upgradeSocket(socket);
  impress.cloud.client = socket;
  socket.on('connect', function() {
    //console.log('impress.cloud.createClient:connect in '+impress.nodeId);
    impress.cloud.status = 'online';
  });
};

// Upgrade socket mixin RPC methods
//
impress.cloud.upgradeSocket = function(socket) {

  //console.log('impress.cloud.upgradeSocket in '+impress.nodeId);

  socket.calls = {};
  socket.packetId = 0;
  setTimeout(function() {
    socket.sendPacket('handshake');
  }, 1000);

  // Create packet
  //   type - packet type: one of PACKET_TYPES
  //   name - target method or event name (optional)
  //   data - payload (optional)
  //   id - use certain packet id (optional)
  //
  socket.packet = function(type, name, data, id) {
    if (!id && type === 'call') id = socket.packetId++;
    return {
      id: id,
      from: impress.nodeId,
      type: type,
      name: name,
      data: data
    };
  };

  // On receive packet from socket
  //
  socket.on('packet', function(packet) {
    //console.log('on packet in '+impress.nodeId+'\n>>>'+JSON.stringify(packet));
    var method = methods[packet.type];
    if (method) method(packet);
  });

  // Packet type handlers
  //
  var methods = {
    handshake: function(packet) {
      if (packet.from) {
        socket.remoteNodeId = packet.from;
        impress.cloud.connections[packet.from] = socket;
      }
    },
    call: function(packet) {
      // Implement call to IAS handlers
      // stub:
      //console.log('call executing in '+impress.nodeId+' with callback to '+socket.remoteNodeId);
      socket.sendPacket('callback', undefined, { result: true }, packet.id);
    },
    callback: function(packet) {
      //console.log('!!!!!! callback executing in '+impress.nodeId);
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
    //console.log('socket.call in '+impress.nodeId);
    var id = socket.sendPacket('call', name, data);
    socket.calls[id] = { id: id, callback: callback };
  };

};
