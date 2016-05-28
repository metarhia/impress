'use strict';

// Cloud RPC for Impress Application Server
//
impress.cloud = new api.events.EventEmitter();

impress.cloud.STATUSES = ['offline', 'connecting', 'sleep', 'online', 'error', 'maintenance'];
impress.cloud.PACKET_TYPES = ['handshake', 'introspection', 'call', 'callback', 'event', 'state', 'health'];
impress.cloud.HANDSHAKE_TIMEOUT = 1000;
impress.cloud.RECONNECT_TIMEOUT = 7000;

impress.cloud.status = 'offline';
impress.cloud.connections = {};
impress.cloud.clusters = {};
impress.cloud.firstInit = true;

// Init Connection
//
impress.cloud.init = function() {
  var msg;
  if (impress.config.scale && impress.cloud.status !== 'online') {
    var target = impress.config.scale.host + ':' + impress.config.scale.port;
    impress.cloud.status = 'connecting';
    if (api.cluster.isMaster && ['controller', 'standalone'].indexOf(impress.config.scale.instance) > -1) {
      if (impress.config.scale.instance === 'controller' && impress.cloud.firstInit) {
        msg = 'RPC listen on ' + target;
        console.log('  ' + msg);
        impress.log.server(msg);
      }
      impress.cloud.role = 'server';
      impress.cloud.createServer();
    } else {
      if (api.cluster.isMaster && impress.cloud.firstInit) {
        msg = 'RPC connect to ' + target;
        console.log('  ' + msg);
        impress.log.server(msg);
      }
      impress.cloud.role = 'client';
      impress.cloud.createClient();
    }
    impress.cloud.firstInit = false;
  }
};

// Initialize Impress Cloud Controller
//
impress.cloud.createServer = function() {
  var server = api.net.createServer(impress.cloud.dispatcher);
  server.listen(impress.config.scale.port, impress.config.scale.host);

  impress.setListenerError(server, impress.config.scale.host + ':' + impress.config.scale.port);

  impress.cloud.server = server;
  impress.cloud.socket = server;

  server.on('listening', function() {
    impress.cloud.status = 'online';
  });

  server.on('connection', function(socket) {
    //impress.cloud.upgradeSocket(socket);

    socket.on('error', function(/*err*/) { });

    socket.on('end', function() {
      if (socket.remoteNodeId) delete impress.cloud.connections[socket.remoteNodeId];
    });
  });

  // Send packet to all clients
  //   packet - packet to send
  //   except - not send to nodeId (optional)
  //
  server.broadcast = function(packet) {
    var socket;
    for (var nodeId in impress.cloud.connections) {
      socket = impress.cloud.connections[nodeId];
      if (socket.remoteNodeId !== packet.from) {
        socket.sendPacket(packet);
      }
    }
  };

};

// Initialize Impress Cloud Node
//
impress.cloud.createClient = function() {
  var client = api.jstp.connect('IPC', impress.config.scale.host, impress.config.scale.port);

  client.on('close', function(err) {
    impress.cloud.status = 'offline';
    if (api.cluster.isMaster) {
      impress.log.warning('Connection to Impress Cloud Conntroller lost, reconnecting...');
    }
    setTimeout(impress.cloud.init, impress.cloud.RECONNECT_TIMEOUT);
  });

  impress.cloud.client = client;
  impress.cloud.socket = client;
  impress.cloud.status = 'connecting';

  client.on('connect', function() {
    impress.cloud.status = 'online';
  });
};

// Call remote method
//
impress.cloud.call = function(app, name, data, target, callback) {
  if (impress.cloud.status === 'online') {
    var socket = impress.cloud.socket;
    var packet = {
      id: socket.packetId++,
      from: impress.nodeId,
      type: 'call',
      app: app,
      name: name,
      target: target,
      data: data
    };
    var id = socket.sendPacket(packet);
    socket.calls[id] = { id: id, callback: callback };
  }
};

// Send event
//
impress.cloud.event = function(app, name, data, target, to) {
  if (impress.cloud.status === 'online') {
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

// Send health
//
impress.cloud.health = function(name, data) {
  if (impress.cloud.status === 'online' && impress.cloud.role === 'client') {
    var packet = {
      from: impress.nodeId,
      type: 'health',
      name: name,
      data: data
    };
    impress.cloud.socket.sendPacket(packet);
  }
};

/*

  var methods = {
    handshake: function(packet) {
      if (packet.from) {
        socket.remoteNodeId = packet.from;
        impress.cloud.connections[packet.from] = socket;
        impress.log.cloud('Cloud RPC handshake from ' + packet.from);
      }
    },
    call: function(packet) {
      var reply = {
        id: packet.id,
        from: impress.nodeId,
        type: 'callback',
        app: packet.app,
        target: 'backend',
        data: { result: 'ok' }
      };
      socket.sendPacket(reply);
    },
    callback: function(packet) {
      var cb = socket.calls[packet.id];
      if (cb && cb.callback) cb.callback(packet.data);
    },
    event: function(packet) {
      var application = impress.applications[packet.app];
      if (application) {
        var isTarget = impress.cloud.role === 'client';
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
      if (application) {
        var isTarget = impress.cloud.role === 'client';
        if (!isTarget) impress.cloud.socket.broadcast(packet);
        else if (application.state) application.state.emit('change', packet.data, isTarget);
      }
    },
    health: function(packet) {
    }
  };

*/

// Mixin cloud to application instance
//
impress.cloud.mixin = function(application) {

  // Call remote method
  //
  application.backend.call = function(name, data, callback) {
    impress.cloud.call(application.name, name, data, 'backend', callback);
  };

  // Call remote method
  //
  application.frontend.call = function(name, data, callback) {
    impress.cloud.call(application.name, name, data, 'frontend', callback);
  };

  // Catch frontend events for application
  //
  application.frontend.on('*', function(eventName, data, isTarget) {
    if (!isTarget) impress.cloud.event(application.name, eventName, data, 'frontend');
    if (application.rpc) application.rpc.sendGlobal(eventName, data);
    if (application.sse) application.sse.sendGlobal(eventName, data);
  });

  // Catch backend events for application
  //
  application.backend.on('*', function(eventName, data, isTarget) {
    if (!isTarget) impress.cloud.event(application.name, eventName, data, 'backend');
  });

  // Start synchronizing application state
  //
  application.state.on('change', function(data, isTarget) {
    if (!isTarget) impress.cloud.state(application.name, data);
  });

  // Send event to all connections of given user
  //
  application.sendToUser = function(login, eventName, data, isTarget) {
    if (impress.cloud.role === 'client' && !isTarget) {
      // target: user, to: login
      impress.cloud.event(application.name, eventName, data);
    }
    if (application.sse) {
      application.sse.sendToUser(login, eventName, data);
    }
  };

  // Send event to all users in channel
  //
  application.sendToChannel = function(channel, eventName, data, isTarget) {
    if (impress.cloud.role === 'client' && !isTarget) {
      // target: channel, to: channel
      impress.cloud.event(application.name, eventName, data);
    }
    if (application.sse) {
      application.sse.sendToChannel(channel, eventName, data);
    }
  };

};

// Dispatch requests
//   socket - an instance of net.Socket
//
impress.cloud.dispatcher = function(socket) {
  var server = impress.cloud.server,
      connection = new api.jstp.Connection(socket, server);
  socket.setTimeout(impress.cloud.HANDSHAKE_TIMEOUT, function() {
    if (!connection.application) {
      socket.destroy();
    }
  });
  socket.on('error', function(err) {
    if (err.code === 'ECONNRESET') {
      console.log('Connection terminated by remote client');
    }
  });
};
