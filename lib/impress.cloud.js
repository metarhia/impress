'use strict';

// Cloud RPC for Impress Application Server
//
impress.cloud = new api.events.EventEmitter();

impress.cloud.STATUSES = ['offline', 'connecting', 'sleep', 'online', 'error', 'maintenance'];
impress.cloud.PACKET_TYPES = ['handshake', 'introspection', 'call', 'callback', 'event', 'state', 'health'];
impress.cloud.RECONNECT_TIMEOUT = 7000;

impress.cloud.status = 'offline';
impress.cloud.clusters = {};
impress.cloud.connections = {}; // keyed by nodeId
impress.cloud.firstInit = true;

// Init Connection
//
impress.cloud.init = function() {
  var msg;
  if (impress.config.scale && impress.cloud.status !== 'online') {
    var target = impress.config.scale.host + ':' + impress.config.scale.port;
    impress.cloud.status = 'connecting';
    if (process.isMaster && ['controller', 'standalone'].indexOf(impress.config.scale.instance) > -1) {
      if (impress.config.scale.instance === 'controller' && impress.cloud.firstInit) {
        msg = 'JSTP listen on ' + target + ' by ' + impress.processMarker + ' Cloud Controller';
        console.log('  ' + msg);
        impress.log.server(msg);
      }
      impress.cloud.role = 'server';
      impress.cloud.createServer();
    } else {
      if (process.isMaster && impress.cloud.firstInit) {
        msg = 'Connect to Cloud Controller ' + target;
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
  var server = api.jstp.createServer();
  server.listen(impress.config.scale.port, impress.config.scale.host);

  impress.setListenerError(server, impress.config.scale.host + ':' + impress.config.scale.port);

  impress.cloud.server = server;
  impress.cloud.connection = server;

  server.on('listening', function() {
    impress.cloud.status = 'online';
  });

  server.on('handshake', function(session, connection) {
    console.log('Cloud RPC server.on(handshake), TODO');
    // socket.remoteNodeId = packet.from;
    // impress.cloud.connections[packet.from] = socket;
    // impress.log.cloud('Cloud RPC handshake from ' + packet.from);
  });
};

// Initialize Impress Cloud Node
//
impress.cloud.createClient = function() {
  var client = api.jstp.connect('cloud', impress.config.scale.host, impress.config.scale.port);

  client.on('close', function(err) {
    impress.cloud.status = 'offline';
    if (process.isMaster) {
      impress.log.warning('Connection to Impress Cloud Conntroller lost, reconnecting...');
    }
    api.timers.setTimeout(impress.cloud.init, impress.cloud.RECONNECT_TIMEOUT);
  });

  impress.cloud.client = client;
  impress.cloud.connection = client;
  impress.cloud.status = 'connecting';

  client.on('connect', function() {
    impress.cloud.status = 'online';
  });
};

// Send event
//
impress.cloud.event = function(app, name, data, target, to) {
  if (impress.cloud.status === 'online') {
    var event = {
      from: impress.nodeId,
      app: app,
      name: name,
      target: target,
      to: to,
      data: data
    };
    impress.cloud.connection.event('cloud', 'event', event);
  }
};

// Send state
//
impress.cloud.state = function(app, data) {
  if (impress.cloud.status === 'online') {
    var delta = {
      from: impress.nodeId,
      app: app,
      data: data
    };
    impress.cloud.socket.event('cloud', 'state', delta);
  }
};

// Send health
//
impress.cloud.health = function() {
};

impress.api.cloud = {};

impress.api.cloud.event = function(event) {
  var application = impress.applications[event.app];
  if (application) {
    var isTarget = impress.cloud.role === 'client';
    if (!isTarget) impress.cloud.socket.broadcast(event);
    else {
      var target;
      if (event.target === 'frontend') target = application.frontend;
      else if (event.target === 'backend') target = application.backend;
      if (target) target.emit(event.name, event.data, isTarget);
    }
  }
};

impress.api.cloud.state = function(delta) {
  var application = impress.applications[delta.app];
  if (application) {
    var isTarget = impress.cloud.role === 'client';
    if (!isTarget) impress.cloud.socket.broadcast(delta);
    else if (application.state) application.state.emit('change', delta.data, isTarget);
  }
};

/*

  var methods = {
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
    health: function(packet) {
    }
  };

*/

// Mixin cloud to application instance
//
impress.cloud.mixin = function(application) {

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
