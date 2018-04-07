'use strict';

// Cloud RPC for Impress Application Server

const cloud = new api.events.EventEmitter();
api.cloud = cloud;

const RECONNECT_TIMEOUT = 7000;

cloud.status = 'offline';
// 'offline', 'connecting', 'sleep', 'online', 'error', 'maintenance'

cloud.connections = {}; // keyed by nodeId

cloud.authenticate = (
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
  cloud.connections[nodeId] = connection;
  callback(null, nodeId);
};

cloud.init = (
  // Init connection
) => {
  if (cloud.status === 'online') return;
  cloud.status = 'connecting';
  if (process.isMaster && impress.config.scale.instance !== 'server') {
    cloud.role = 'server';
    cloud.setupServer();
  } else if (!process.isMaster) {
    cloud.role = 'client';
    cloud.connectClient();
  } else {
    const target = impress.config.scale.host + ':' + impress.config.scale.port;
    const message = 'Connect to Cloud Controller ' + target;
    impress.log.system(message);
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
      api.cloud.event(args);
    } else if (name === 'state') {
      api.cloud.state(args);
    }
  });
};

cloud.setupServer = (
  // Initialize Impress Cloud Controller
) => {
  const server = impress.config.servers.master;
  if (!server) return;
  cloud.server = server.instance;
  cloud.status = 'online';
  cloud.server.on('connect', connection => {
    setupEventHandlers(connection);
  });
};

cloud.connectClient = (
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
      cloud.status = 'offline';
      impress.log.error('Cannot connect to Cloud Controller: ' + err);
      return;
    }
    cloud.status = 'online';
    cloud.connection = connection;
    setupEventHandlers(connection);

    connection.on('close', () => {
      if (impress.finalization || cloud.status !== 'online') return;
      cloud.status = 'offline';
      impress.log.warn('Connection lost, reconnecting...');
      api.timers.setTimeout(cloud.init, RECONNECT_TIMEOUT);
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
  if (cloud.connection) {
    cloud.connection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else if (eventArgs.to) {
    const targetConnection = cloud.connections[eventArgs.to];
    targetConnection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else {
    const nodeIds = Object.keys(cloud.connections);
    const nodesCount = nodeIds.length;
    let i;
    for (i = 0; i < nodesCount; i++) {
      const connection = cloud.connections[nodeIds[i]];
      connection.emitRemoteEvent('cloud', eventName, eventArgs);
    }
  }
};

cloud.event = (
  // Send event
  app, // application name
  name, // event name
  data, // attached data
  target, // target name
  to // destination name
) => {
  if (cloud.status !== 'online') return;
  const event = { from: impress.nodeId, app, name, target, to, data };
  emitRemoteEvent('impressEvent', event);
};

cloud.state = (
  // Send state
  app, // application name
  data // attached data
) => {
  if (cloud.status !== 'online') return;
  const delta = { from: impress.nodeId, app, data };
  emitRemoteEvent('state', delta);
};

cloud.health = (
  // Send health
) => {};

cloud.event = (event) => {
  if (cloud.role === 'server' && impress.nodeId !== event.to) {
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

cloud.state = (delta) => {
  const isTarget = cloud.role === 'client';
  if (!isTarget) {
    emitRemoteEvent('state', delta);
  } else if (impress.nodeId !== delta.from) {
    const application = impress.applications[delta.app];
    if (application && application.state) {
      application.state.emit('change', delta.data, isTarget);
    }
  }
};

const mixin = (application) => {

  application.sendEventToNode = (eventName, data, nodeId) => (
    cloud.event(application.name, eventName, data, 'backend', nodeId)
  );

  application.frontend.on('*', (eventName, data, isTarget) => {
    if (!isTarget) {
      cloud.event(application.name, eventName, data, 'frontend');
    }
    if (application.sse) {
      application.sse.sendGlobal(eventName, data);
    }
  });

  application.backend.on('*', (eventName, data, isTarget) => {
    if (!isTarget) {
      cloud.event(application.name, eventName, data, 'backend');
    }
  });

  application.state.on('change', (data, isTarget) => {
    if (!isTarget) {
      cloud.state(application.name, data);
    }
  });

  application.sendToUser = (login, eventName, data, isTarget) => {
    if (cloud.role === 'client' && !isTarget) {
      // target: user, to: login
      cloud.event(application.name, eventName, data);
    }
    if (application.sse) {
      application.sse.sendToUser(login, eventName, data);
    }
  };

  application.sendToChannel = (channel, eventName, data, isTarget) => {
    if (cloud.role === 'client' && !isTarget) {
      // target: channel, to: channel
      cloud.event(application.name, eventName, data);
    }
    if (application.sse) {
      application.sse.sendToChannel(channel, eventName, data);
    }
  };

};

module.exports = {
  mixinApplication: mixin
};
