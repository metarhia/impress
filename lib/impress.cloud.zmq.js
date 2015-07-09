'use strict';

//console.log('transport: zmq');

var zmq = require('zmq');

impress.cloud.transport = {};

// Wrap ZMQ to emulate server socket
//
impress.cloud.transport.createServer = function() {

  //console.log('impress.cloud.transport.createServer in '+impress.nodeId);

  var uri = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.rpcPort;
  var server = zmq.socket('router');
  server.identity = impress.nodeId;
  impress.cloud.transport.upgradeSocket(server);

  server.bind(uri, function(err) {
    if (err) throw err;
    server.on('message', function(envelope, data) {
      //console.log('server on message from: '+envelope);
      var socket = impress.cloud.connections[envelope];
      if (socket) {
        //console.log('  client '+envelope+' found');
        socket.emit('packet', JSON.parse(data));
      } else {
        //console.log('  client '+envelope+' not found, creating...');
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

  //console.log('impress.cloud.transport.createClient in '+impress.nodeId);

  var uri = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.rpcPort;
  var client = zmq.socket('dealer');
  client.identity = impress.nodeId;
  client.connect(uri);
  impress.cloud.transport.upgradeSocket(client);

  client.on('message', function(data) {
    //console.log('client on message '+impress.nodeId+' received data: '+data);
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
    if (impress.cloud.role === 'server') {
      //console.log('socket.sendPacket in '+impress.nodeId+' to '+socket.remoteNodeId+' data:'+buf);
      impress.cloud.server.send([socket.remoteNodeId, buf]);
    } else {
      //console.log('socket.sendPacket in '+impress.nodeId+' to server data:'+buf);
      socket.send(buf);
    }
    return packet.id;
  };

};
