'use strict';

// Cloud RPC for Impress Application Server

impress.cloud = new api.events.EventEmitter();

impress.cloud.STATUSES = [
  'offline', 'connecting', 'sleep', 'online', 'error', 'maintenance'
];

impress.cloud.RECONNECT_TIMEOUT = 7000;

impress.cloud.status = 'offline';
impress.cloud.connections = {}; // keyed by nodeId

impress.cloud.authenticate = (
  // Authenticated handshake handler for Impress Cloud Controller
  connection, // JSTP connection
  application, // Cloud Controller JSTP application
  strategy, //JSTP authentication strategy
  [
    nodeId, // server name
    cloudAccessKey, // cloud access key
  ],
  callback // function
) => {
  if (strategy !== 'login' || cloudAccessKey !== impress.config.scale.key) {
    callback(api.jstp.ERR_AUTH_FAILED);
    return;
  }
  impress.cloud.connections[nodeId] = connection;
  callback(null, nodeId);
};

impress.cloud.init = (
  // Init connection
) => {
  if (impress.cloud.status === 'online') return;
  impress.cloud.status = 'connecting';
  if (process.isMaster && impress.config.scale.instance !== 'server') {
    impress.cloud.role = 'server';
    impress.cloud.setupServer();
  } else if (!process.isMaster) {
    impress.cloud.role = 'client';
    impress.cloud.connectClient();
  } else {
    const target = impress.config.scale.host + ':' + impress.config.scale.port;
    const message = 'Connect to Cloud Controller ' + target;
    console.log('  ' + message);
    impress.log.server(message);
  }
};

const setupEventHandlers = (
  // Setup event and state event handlers
  // These should be replaced with built-in
  // JSTP facilities after a massive refactor
  connection
) => {
  connection.on('event', (event) => {
    if (event.interfaceName !== 'cloud') return;
    const name = event.remoteEventName;
    const args = event.remoteEventArgs;

    if (name === 'impressEvent') {
      impress.api.cloud.event(args);
    } else if (name === 'state') {
      impress.api.cloud.state(args);
    }
  });
};

impress.cloud.setupServer = (
  // Initialize Impress Cloud Controller
) => {
  const server = impress.config.servers.master;
  if (!server) return;
  impress.cloud.server = server.instance;
  impress.cloud.status = 'online';
  impress.cloud.server.on('connect', connection => {
    setupEventHandlers(connection);
  });
};

impress.cloud.connectClient = (
  // Initialize Impress Cloud Node
) => {
  let target;
  if (impress.config.scale.instance === 'server') {
    target = impress.config.scale.controller;
  } else {
    const master = impress.config.servers.master;
    target = {
      host: master.address,
      port: master.ports[0]
    };
  }

  const client = {
    application: impress,
    connectPolicy: new api.jstp.SimpleConnectPolicy(
      impress.nodeId, impress.config.scale.key
    ),
  };

  api.jstp.net.connect('impress', client, target, (err, connection) => {
    if (err) {
      impress.cloud.status = 'offline';
      impress.log.error('Cannot connect to Cloud Controller: ' + err);
      return;
    }
    impress.cloud.status = 'online';
    impress.cloud.connection = connection;
    setupEventHandlers(connection);

    connection.on('close', () => {
      if (impress.finalization || impress.cloud.status !== 'online') return;
      impress.cloud.status = 'offline';
      impress.log.warning('Connection lost, reconnecting...');
      api.timers.setTimeout(
        impress.cloud.init, impress.cloud.RECONNECT_TIMEOUT
      );
    });

    connection.on('error', (err) => {
      impress.log.error('Cloud Controller connection error: ' + err);
    });
  });
};

const emitRemoteEvent = (
  // Send an event over JSTP
  eventName,
  eventArgs
) => {
  if (impress.cloud.connection) {
    impress.cloud.connection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else if (eventArgs.to) {
    const targetConnection = impress.cloud.connections[eventArgs.to];
    targetConnection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else {
    const nodeIds = Object.keys(impress.cloud.connections);
    const nodesCount = nodeIds.length;
    let i;
    for (i = 0; i < nodesCount; i++) {
      const connection = impress.cloud.connections[nodeIds[i]];
      connection.emitRemoteEvent('cloud', eventName, eventArgs);
    }
  }
};

impress.cloud.event = (
  // Send event
  app, // application name
  name, // event name
  data, // attached data
  target, // target name
  to // destination name
) => {
  if (impress.cloud.status !== 'online') return;
  const event = { from: impress.nodeId, app, name, target, to, data };
  emitRemoteEvent('impressEvent', event);
};

impress.cloud.state = (
  // Send state
  app, // application name
  data // attached data
) => {
  if (impress.cloud.status !== 'online') return;
  const delta = { from: impress.nodeId, app, data };
  emitRemoteEvent('state', delta);
};

impress.cloud.health = (
  // Send health
) => {};

impress.api.cloud = {};

impress.api.cloud.event = (event) => {
  if (impress.cloud.role === 'server' && impress.nodeId !== event.to) {
    emitRemoteEvent('impressEvent', event);
  } else if (impress.nodeId !== event.from) {
    if (event.to && impress.nodeId !== event.to) return;
    const application = impress.applications[event.app];
    if (application) {
      let target;
      if (event.target === 'frontend' || event.target === 'backend') {
        target = application[event.target];
      }
      if (target) target.emit(event.name, event.data, true);
    }
  }
};

impress.api.cloud.state = (delta) => {
  const isTarget = impress.cloud.role === 'client';
  if (!isTarget) {
    emitRemoteEvent('state', delta);
  } else if (impress.nodeId !== delta.from) {
    const application = impress.applications[delta.app];
    if (application && application.state) {
      application.state.emit('change', delta.data, isTarget);
    }
  }
};

impress.cloud.mixin = (application) => {

  application.sendEventToNode = (eventName, data, nodeId) => (
    impress.cloud.event(application.name, eventName, data, 'backend', nodeId)
  );

  application.frontend.on('*', (eventName, data, isTarget) => {
    if (!isTarget) {
      impress.cloud.event(application.name, eventName, data, 'frontend');
    }
    if (application.sse) {
      application.sse.sendGlobal(eventName, data);
    }
  });

  application.backend.on('*', (eventName, data, isTarget) => {
    if (!isTarget) {
      impress.cloud.event(application.name, eventName, data, 'backend');
    }
  });

  application.state.on('change', (data, isTarget) => {
    if (!isTarget) {
      impress.cloud.state(application.name, data);
    }
  });

  application.sendToUser = (login, eventName, data, isTarget) => {
    if (impress.cloud.role === 'client' && !isTarget) {
      // target: user, to: login
      impress.cloud.event(application.name, eventName, data);
    }
    if (application.sse) {
      application.sse.sendToUser(login, eventName, data);
    }
  };

  application.sendToChannel = (channel, eventName, data, isTarget) => {
    if (impress.cloud.role === 'client' && !isTarget) {
      // target: channel, to: channel
      impress.cloud.event(application.name, eventName, data);
    }
    if (application.sse) {
      application.sse.sendToChannel(channel, eventName, data);
    }
  };

};
