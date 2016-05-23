'use strict';

// JSTP Connection for Impress Application Server

// Connection class
//   application - instance of application
//   socket - instance of http.Socket
//
var Connection = function(socket) {
  var connection = this,
      server = impress.config.servers[socket.server.serverName];

  socket.connection = connection;
  connection.socket = socket;
  connection.cid = 0;
  connection.packets = [];
  connection.packetId = 0;
  connection.startTime = Date.now();
  connection.server = server;
  connection.ip = socket.remoteAddress;
  connection.chunks = new api.jstp.Chunks();

  socket.on('data', function(data) {
    var packets = connection.chunks.add(data);
    if (packets) {
      packets = api.jstp.removeDelimiters(packets);
      connection.packets = connection.packets.concat(packets);
      connection.process();
    }
  });

  socket.on('close', function() {
    //console.log('Connection closed');
    var application = connection.application;
    if (application) {
      delete application.connections[connection.cid];
      application.emit('disconnect', connection);
    }
  });

  socket.on('error', function(err) {
    if (err.code === 'ECONNRESET') {
      //console.log('Connection terminated by remote client');
    }
  });

};

impress.Connection = Connection;

Connection.prototype.process = function() {
  var packet, connection = this;

  function cb(result) {
    connection.callback(packetId, result);
  }

  while (connection.packets.length) {
    packet = connection.packets.shift();
    //console.dir({ process: packet });
    var keys = Object.keys(packet);
    if (keys[0] === 'handshake') {
      var appName = packet['handshake'][1],
          application = impress.applications[appName];
      if (application) {
        //console.log('Selected app: ' + application.name);
        connection.application = application;
        connection.cid = application.cid++;
        application.emit('connect', connection);
        application.connections[connection.cid] = connection;
      } else {
        connection.end({ handshake: [-1], error: [4] });
      }
    } else if (keys[0] === 'call') {
      if (connection.application) {
        var packetId = packet['call'][0],
            ifName = packet['call'][1],
            apiInterface = connection.application.api[ifName],
            methodName = keys[1],
            args = packet[methodName];
        if (apiInterface) {
          apiInterface[methodName](connection, args, cb);
        }
      }
    }
  }
};

Connection.prototype.send = function(data) {
  var packet = api.jstp.stringify(data);
  this.socket.write(packet);
};

Connection.prototype.end = function(data) {
  var packet = api.jstp.stringify(data);
  this.socket.end(packet);
};

Connection.prototype.call = function(interfaceName, methodName, parameters, callback) {
  this.send(
    api.jstp.packet(
      'call', this.packetId--, interfaceName, methodName, parameters
    )
  );
};

Connection.prototype.callback = function(packetId, result) {
  this.send(
    api.jstp.packet('callback', packetId, null, 'ok', result)
  );
};

Connection.prototype.event = function(interfaceName, eventName, parameters) {
  this.send(
    api.jstp.packet(
      'event', this.packetId--, interfaceName, eventName, parameters
    )
  );
};
