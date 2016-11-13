'use strict';

// Cloud RPC for Impress Application Server
//
impress.cloud = new api.events.EventEmitter();

impress.cloud.STATUSES = ['offline', 'connecting', 'sleep', 'online', 'error', 'maintenance'];

impress.cloud.RECONNECT_TIMEOUT = 7000;

impress.cloud.status = 'offline';
impress.cloud.connections = {}; // keyed by nodeId

// JSTP server applications provider
//
impress.cloud.appProvider = {};

// Get JSTP application
//   appName - application name
//
impress.cloud.appProvider.getApplication = function(appName) {
  if (appName === 'impress') {
    return impress;
  }
};

// JSTP client application provider
//
impress.cloud.clientAppProvider = {};

// Get JSTP application
//
impress.cloud.clientAppProvider.getApplication = function() {
  return impress;
};

var auth = {};

// JSTP authentication provider
//
impress.cloud.authProvider = auth;

// Anonymous handshake handler for Impress Cloud Controller
//   connection - JSTP connection
//   application - Cloud Controller JSTP application
//   callback - callback function
//
auth.startAnonymousSession = function(connection, application, callback) {
  callback(api.jstp.ERR_AUTH_FAILED);
};

// Authenticated handshake handler for Impress Cloud Controller
//   connection - JSTP connection
//   application - Cloud Controller JSTP application
//   nodeId - server name
//   cloudAccessKey - cloud access key
//   callback - callback function
//
auth.startAuthenticatedSession = function(connection, application,
                                          nodeId, cloudAccessKey, callback) {
  if (cloudAccessKey !== impress.config.scale.key) {
    return callback(api.jstp.ERR_AUTH_FAILED);
  }

  impress.cloud.connections[nodeId] = connection;

  var sessionId = api.common.generateGUID();
  callback(null, sessionId);
};

// Init connection
//
impress.cloud.init = function() {
  if (impress.cloud.status === 'online') {
    return;
  }

  impress.cloud.status = 'connecting';

  if (process.isMaster && impress.config.scale.instance !== 'server') {
    impress.cloud.role = 'server';
    impress.cloud.setupServer();
  } else if (!process.isMaster) {
    impress.cloud.role = 'client';
    impress.cloud.connectClient();
  } else {
    var target = impress.config.scale.host + ':' + impress.config.scale.port;
    var message = 'Connect to Cloud Controller ' + target;

    console.log('  ' + message);
    impress.log.server(message);
  }
};

// Initialize Impress Cloud Controller
//
impress.cloud.setupServer = function() {
  var server = impress.config.servers.master;

  if (!server) {
    return;
  }

  impress.cloud.server = server.instance;
  impress.cloud.status = 'online';

  impress.cloud.server.on('connect', function(connection) {
    setupEventHandlers(connection);
  });
};

// Initialize Impress Cloud Node
//
impress.cloud.connectClient = function() {
  var target;

  if (impress.config.scale.instance === 'server') {
    target = impress.config.scale.controller;
  } else {
    var master = impress.config.servers.master;
    target = {
      host: master.address,
      port: master.ports[0]
    };
  }

  var client = api.jstp.tcp.createClient(target,
    impress.cloud.clientAppProvider);

  client.on('close', function() {
    if (impress.cloud.status !== 'online') {
      return;
    }

    impress.cloud.status = 'offline';

    impress.log.warning('Connection to Impress Cloud Conntroller lost, reconnecting...');
    api.timers.setTimeout(impress.cloud.init, impress.cloud.RECONNECT_TIMEOUT);
  });

  client.on('error', function(error) {
    impress.log.error('Cloud Controller connection error: ' + error);
  });

  client.connectAndHandshake(
    'impress',
    impress.nodeId,
    impress.config.scale.key,
    function(error, connection) {
      if (error) {
        impress.cloud.status = 'offline';
        impress.log.error('Cannot connect to Cloud Controller: ' + error);
      } else {
        impress.cloud.status = 'online';
        impress.cloud.connection = connection;
        setupEventHandlers(connection);
      }
    }
  );
};

// Send event
//
impress.cloud.event = function(app, name, data, target, to) {
  if (impress.cloud.status !== 'online') {
    return;
  }

  var event = {
    from: impress.nodeId,
    app: app,
    name: name,
    target: target,
    to: to,
    data: data
  };

  emitRemoteEvent('impressEvent', event);
};

// Send state
//
impress.cloud.state = function(app, data) {
  if (impress.cloud.status !== 'online') {
    return;
  }

  var delta = {
    from: impress.nodeId,
    app: app,
    data: data
  };

  emitRemoteEvent('state', delta);
};

// Send an event over JSTP
//
function emitRemoteEvent(eventName, eventArgs) {
  if (impress.cloud.connection) {
    impress.cloud.connection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else {
    var nodeIds = Object.keys(impress.cloud.connections);
    var nodesCount = nodeIds.length;
    for (var i = 0; i < nodesCount; i++) {
      var connection = impress.cloud.connections[nodeIds[i]];
      connection.emitRemoteEvent('cloud', eventName, eventArgs);
    }
  }
}

// Setup event and state event handlers. These should be replaced with built-in
// JSTP facilities after a massive refactor.
//
function setupEventHandlers(connection) {
  connection.on('event', function(event) {
    if (event.interfaceName !== 'cloud') {
      return;
    }

    var name = event.remoteEventName;
    var args = event.remoteEventArgs;

    if (name === 'impressEvent') {
      impress.api.cloud.event(args);
    }

    if (name === 'state') {
      impress.api.cloud.state(args);
    }
  });
}

// Send health
//
impress.cloud.health = function() {
};

impress.api.cloud = {};

impress.api.cloud.event = function(event) {
  var isTarget = impress.cloud.role === 'client';
  if (!isTarget) {
    emitRemoteEvent('impressEvent', event);
  } else if (impress.nodeId !== event.from) {
    var application = impress.applications[event.app];
    if (application) {
      var target;
      if (event.target === 'frontend') target = application.frontend;
      else if (event.target === 'backend') target = application.backend;
      if (target) target.emit(event.name, event.data, isTarget);
    }
  }
};

impress.api.cloud.state = function(delta) {
  var isTarget = impress.cloud.role === 'client';
  if (!isTarget) {
    emitRemoteEvent('state', delta);
  } else if (impress.nodeId !== delta.from) {
    var application = impress.applications[delta.app];
    if (application && application.state) {
      application.state.emit('change', delta.data, isTarget);
    }
  }
};

// Mixin cloud to application instance
//
impress.cloud.mixin = function(application) {

  // Catch frontend events for application
  //
  application.frontend.on('*', function(eventName, data, isTarget) {
    if (!isTarget) impress.cloud.event(application.name, eventName, data, 'frontend');
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
