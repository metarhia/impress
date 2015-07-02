'use strict';

console.log('transport: zmq');

var zmq = require('zmq');

impress.cloud.transport = {};

// Wrap ZMQ to emulate server socket
//
impress.cloud.transport.createServer = function() {

  //console.log('impress.cloud.transport.createServer in '+impress.nodeId);
  var server = new api.events.EventEmitter();

  // ZeroMQ publisher socket
  //
  impress.cloud.transport.pub = zmq.socket('pub');
  var pubAddress = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.subPort;
  impress.cloud.transport.pub.bind(pubAddress, function(err) {
    if (err) console.log(err);
    else console.log('  zmq publisher ' + impress.config.scale.subPort);
  });

  // ZeroMQ reply socket
  //
  impress.cloud.transport.rep = zmq.socket('rep');
  impress.cloud.transport.rep.on('message', function(request) {
    //var msg = JSON.parse(request.toString());
    //msg.name
    //impress.cloud.transport.rep.send('{"result":"ok"}');
    //impress.cloud.transport.pub.send('');
    console.dir(impress.nodeId+' rep received: '+request.toString());
  });

  var repAddress = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.reqPort;
  impress.cloud.transport.rep.bind(repAddress, function(err) {
    if (err) console.log(err);
    else console.log('  zmq reply ' + impress.config.scale.reqPort);
  });

  setImmediate(function() {
    impress.cloud.transport.rep.send('{"from1":"'+impress.nodeId+'"}');
    impress.cloud.transport.pub.send('{"from2":"'+impress.nodeId+'"}');
    
    /*var socket, worker;
    for (var workerId in api.cluster.workers) {
      worker = api.cluster.workers[workerId];
      if (!worker.suicide) {
        console.log('  create socket and emit connection');
        socket = new api.events.EventEmitter();
        socket.process = worker;
        impress.cloud.transport.upgradeSocket(socket);
        server.emit('connection', socket);
      }
    }*/
  });
  return server;
};

// Wrap ZMQ to emulate client socket
//
impress.cloud.transport.createClient = function() {

  console.log('impress.cloud.transport.createClient in '+impress.nodeId);
  var socket = new api.events.EventEmitter();

  // ZeroMQ subscriber socket
  //
  impress.cloud.transport.sub = zmq.socket('sub');
  impress.cloud.transport.sub.on('message', function(reply) {
    console.dir(impress.nodeId+' sub received: '+reply.toString());
  });
  var subAddress = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.subPort
  impress.cloud.transport.sub.connect(subAddress);
  impress.cloud.transport.sub.subscribe('');
  console.log('  zmq subscriber ' + impress.config.scale.subPort);

  // ZeroMQ request socket
  //
  impress.cloud.transport.req = zmq.socket('req');
  impress.cloud.transport.req.on('message', function(reply) {
    console.dir(impress.nodeId+' sub received: '+reply.toString());
  });
  var reqAddress = 'tcp://' + impress.config.scale.host + ':' + impress.config.scale.reqPort;
  impress.cloud.transport.req.connect(reqAddress);
  console.log('  zmq request ' + impress.config.scale.reqPort);
  impress.cloud.transport.req.send('{"from3":"'+impress.nodeId+'"}');
  

  //impress.cloud.transport.upgradeSocket(socket);
  return socket;

};

// Upgrade socket to packet transmission layer
//
impress.cloud.transport.upgradeSocket = function(socket) {
  
  // Send packet to socket
  //
  socket.sendPacket = function(type, name, data, id) {
    var packet = socket.packet(type, name, data, id);
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
