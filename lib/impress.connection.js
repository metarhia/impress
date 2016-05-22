'use strict';

// JSTP Connection for Impress Application Server

// Connection class
//   application - instance of application
//   socket - instance of http.Socket
//
var Connection = function(application, socket) {
  var connection = this,
      server = impress.config.servers[socket.server.serverName];

  socket.connection = connection;

  connection.cid = application.cid++;
  application.connections[connection.cid] = connection;

  connection.packetId = 0;
  connection.startTime = Date.now();
  connection.server = server;
  connection.application = application;
  connection.ip = socket.remoteAddress;
  connection.chunks = [];

  application.emit('connect', connection);

  socket.on('data', function(data) {
    connection.chunks.push(data);
    if (data.indexOf('}') > -1) {
      var key, val,
          buf = Buffer.concat(chunks).toString(),
          packet = api.jstp.parse(buf);
      console.dir(packet);
      connection.chunks = [];
    }
  });

  socket.on('close', function() {
    delete application.connections[connection.cid];
    application.emit('disconnect', connection);
  });
};

impress.Connection = Connection;
Connection.prototype.application = impress;

Connection.prototype.send = function(data) {
  var packet = api.jstp.stringify(data);
  this.socket.write(packet);
};

Connection.prototype.call = function(interfaceName, methodName, parameters, callback) {
  var data = {};
  this.packetId--;
  data.call = [this.packetId, interfaceName];
  data[methodName] = parameters;
  this.send(data);
};

Connection.prototype.event = function(interfaceName, eventName, parameters) {
  var data = {};
  this.packetId--;
  data.event = [this.packetId, interfaceName];
  data[eventName] = parameters;
  this.send(data);
};
