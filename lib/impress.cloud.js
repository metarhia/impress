'use strict';

impress.cloud = new api.events.EventEmitter();

impress.cloud.status = 'offline';
impress.cloud.STATUSES = [ 'offline', 'connecting', 'sleep', 'online', 'offline', 'error', 'maintenance' ];
impress.cloud.PACKET_TYPES = [ 'handshake', 'introspection', 'call', 'callback', 'event', 'state', 'health' ];
impress.cloud.connections = {};
impress.cloud.clusters = {};
impress.cloud.nextCluster = 1;

// Init Connection
//
impress.cloud.init = function() {
  if (impress.config.scale) {
    if (api.cluster.isMaster && ['controller', 'standalone'].indexOf(impress.config.scale.instance) > -1) {
      if (impress.config.scale.instance === 'controller') {
        console.log('  RPC listen on ' + impress.config.scale.host + ':' + impress.config.scale.rpcPort);
      }
      impress.cloud.role = 'server';
      impress.cloud.createServer();
    } else {
      if (api.cluster.isMaster) {
        console.log('  RPC connect to ' + impress.config.scale.host + ':' + impress.config.scale.rpcPort);
      }
      impress.cloud.role = 'client';
      impress.cloud.createClient();
    }
  }
};

// Initialize Impress Cloud Controller
//
impress.cloud.createServer = function() {
  //console.log('impress.cloud.createServer in '+impress.nodeId);
  var server = impress.cloud.transport.createServer();
  impress.cloud.server = server;
  impress.cloud.socket = server;
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
  server.broadcast = function(packet) {
    //console.log('server.broadcast in '+impress.nodeId);
    var socket;
    for (var nodeId in impress.cloud.connections) {
      //console.log('  nodeId:'+nodeId+' except:'+packet.from);
      socket = impress.cloud.connections[nodeId];
      if (socket.remoteNodeId !== packet.from) {
        //console.log('    send');
        socket.sendPacket(packet);
      }
    }
  };

};

// Initialize Impress Cloud Node
//
impress.cloud.createClient = function() {
  //console.log('impress.cloud.createClient in '+impress.nodeId);
  var client = impress.cloud.transport.createClient();
  impress.cloud.upgradeSocket(client);
  impress.cloud.client = client;
  impress.cloud.socket = client;
  impress.cloud.status = 'connecting';
  client.on('connect', function() {
    //console.log('impress.cloud.createClient:connect in '+impress.nodeId);
    impress.cloud.status = 'online';
  });
};

// Call remote method
//
impress.cloud.call = function(app, name, data, callback) {
  if (impress.cloud.status === 'online') {
    //console.log('socket.call in '+impress.nodeId);
    var packet = {
      id: socket.packetId++,
      from: impress.nodeId,
      type: 'call',
      app: app,
      name: name,
      target: 'backend',
      data: data
    };
    var id = impress.cloud.socket.sendPacket(packet);
    impress.cloud.socket.calls[id] = { id: id, callback: callback };
  }
};

// Send event
//
impress.cloud.event = function(app, name, data, target, to) {
  if (impress.cloud.status === 'online') {
    //console.log('impress.cloud.event in '+impress.nodeId);
    var packet = {
      from: impress.nodeId,
      type: 'event',
      app: app,
      name: name,
      target: target,
      to: to,
      data: data
    };
    if (impress.cloud.role === 'server') impress.cloud.socket.broadcast(packet);
    else impress.cloud.socket.sendPacket(packet);
  }
};

// Send state
//
impress.cloud.state = function(app, data) {
  if (impress.cloud.status === 'online') {
    var packet = {
      from: impress.nodeId,
      type: 'state',
      app: app,
      data: data
    };
    if (impress.cloud.role === 'server') impress.cloud.socket.broadcast(packet);
    else impress.cloud.socket.sendPacket(packet);
  }
};

// Upgrade socket mixin RPC methods
//
impress.cloud.upgradeSocket = function(socket) {

  //console.log('impress.cloud.upgradeSocket in '+impress.nodeId);

  socket.calls = {};
  socket.packetId = 0;
  setTimeout(function() {
    socket.sendPacket({
      from: impress.nodeId,
      type: 'handshake'
    });
  }, 1000);

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
      //console.log('method handshake in '+impress.nodeId+' packet='+JSON.stringify(packet));
      if (packet.from) {
        socket.remoteNodeId = packet.from;
        impress.cloud.connections[packet.from] = socket;
      }
    },
    call: function(packet) {
      //console.log('call executing in '+impress.nodeId+' with callback to '+socket.remoteNodeId);
      var reply = {
        id: packet.id,
        from: impress.nodeId,
        type: 'callback',
        app: packet.app,
        target: 'backend',
        data: { result: 'OK' }
      };
      socket.sendPacket(reply);
    },
    callback: function(packet) {
      //console.log('callback executing in '+impress.nodeId);
      var cb = socket.calls[packet.id];
      if (cb && cb.callback) cb.callback(packet.data);
    },
    event: function(packet) {
      var application = impress.applications[packet.app];
      //console.log('method event in '+impress.nodeId);
      if (application) {
        var isTarget = impress.cloud.role === 'client';
        //if (packet.user) application.events.sendToUser(packet.user, packet.event, packet.data, isTarget);
        //else if (packet.channel) application.events.sendToChannel(packet.channel, packet.event, packet.data, isTarget);
        //if (packet.target === 'global') application.events.sendGlobal(packet.event, packet.data, isTarget);
        if (!isTarget) impress.cloud.socket.broadcast(packet);
        else {
          var target;
          if (packet.target === 'frontend') target = application.frontend;
          else if (packet.target === 'backend') target = application.backend;
          if (target) target.emit(packet.name, packet.data, isTarget);
        }
      }
    },
    state: function(packet) {
      var application = impress.applications[packet.app];
      //console.log('method state in '+impress.nodeId);
      if (application) {
        var isTarget = impress.cloud.role === 'client';
        if (!isTarget) impress.cloud.socket.broadcast(packet);
        else application.state.emit('change', packet.data, isTarget);
      }
    },
    health: function(packet) {
    }
  };

  // Call remote method
  //
  socket.call = function(app, name, data, callback) {
    //console.log('socket.call in '+impress.nodeId);
    var packet = {
      id: socket.packetId++,
      from: impress.nodeId,
      type: 'call',
      app: app,
      name: name,
      target: 'backend',
      data: data
    };
    var id = socket.sendPacket(packet);
    socket.calls[id] = { id: id, callback: callback };
  };

};

// Generate next free cluster name
//
impress.cloud.generateNextCluster = function() {
  var next, cluster, result;
  do {
    next = 'C' + impress.cloud.nextCluster++;
    cluster = impress.cloud.clusters[next];
    if (!cluster) result = next;
  } while (!result);
  return result;
};

// Mixin cloud to application instance
//
impress.cloud.mixinApplication = function(application) {

  application.frontend.on('*', function(eventName, data, isTarget) {
    //console.log('application.frontend.on * in '+impress.nodeId+' isTarget='+isTarget);
    if (!isTarget) impress.cloud.event(application.name, eventName, data, undefined, 'frontend');
    if (application.sse) application.sse.sendGlobal(eventName, data);
    //if (isTarget) application.frontend.emit(eventName, data);
  });

  application.backend.on('*', function(eventName, data, isTarget) {
    //console.log('application.backend.on * in '+impress.nodeId+' isTarget='+isTarget);
    if (!isTarget) impress.cloud.event(application.name, eventName, data, undefined, 'backend');
  });

  setTimeout(function() {
    application.state.on('change', function(data, isTarget) {
      //console.log('application.backend.on * in '+impress.nodeId+' isTarget='+isTarget);
      if (!isTarget) impress.cloud.state(application.name, data);
    });
  }, 1000);

  // Send event to all connections of given user
  //
  application.sendToUser = function(login, eventName, data, isTarget) {
    if (impress.cloud.role === 'client' && !isTarget) impress.cloud.event(application.name, eventName, data); // target: user, to: login
    if (application.sse) application.sse.sendToUser(login, eventName, data);
  };

  // Send event to all users in channel
  //
  application.sendToChannel = function(channel, eventName, data, isTarget) {
    if (impress.cloud.role === 'client' && !isTarget) impress.cloud.event(application.name, eventName, data); // target: channel, to: channel
    if (application.sse) application.sse.sendToChannel(channel, eventName, data);
  };

};
