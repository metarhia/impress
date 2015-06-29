'use strict';

console.log('transport: ipc');

impress.cloud.transport = {};

impress.cloud.transport.createServer = function() {
  var server = new api.events.EventEmitter();
  server.listen = function(port, host) {};
  server.emit('listening');
  var socket;
  for (var workerId = 0; workerId < impress.config.scale.workers; workerId++) {
    socket = impress.cloud.transport.socket();
    server.emit('connection', socket);
  }
  return server;
};

impress.cloud.transport.connect = function() {
  var socket = impress.cloud.transport.socket();
  return socket;
};

impress.cloud.transport.socket = function() {
  var socket = new api.events.EventEmitter();
  socket.write = function(packet) {
    process.send(packet);
  };
  process.on('message', function(message, socket) {
    socket.emit('data', message);
  });
  return socket;
};
