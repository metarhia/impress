'use strict';

// Cloud RPC for Impress Application Server

const cloud = new api.events.EventEmitter();
api.cloud = cloud;

const RECONNECT_TIMEOUT = 7000;

cloud.status = 'offline';
// 'offline', 'connecting', 'sleep', 'online', 'error', 'maintenance'

cloud.connections = {}; // keyed by nodeId

// Authenticated handshake handler for Impress Cloud Controller
//   connection <Object> JSTP connection
//   application <Object> Cloud Controller JSTP application
//   strategy <string> JSTP authentication strategy
//   nodeId <string> server name
//   cloudAccessKey <string> cloud access key
//   callback <Function>
cloud.authenticate = (
  connection, application, strategy, [nodeId, cloudAccessKey], callback
) => {
  const key = impress.config.sections.scale.key;
  if (strategy !== 'login' || cloudAccessKey !== key) {
    callback(api.jstp.ERR_AUTH_FAILED);
    return;
  }
  cloud.connections[nodeId] = connection;
  callback(null, nodeId);
};

// Init connection
cloud.init = () => {
  if (cloud.status === 'online') return;
  cloud.status = 'connecting';
  if (impress.isMaster && impress.config.sections.scale.instance !== 'server') {
    cloud.role = 'server';
    cloud.setupServer();
  } else if (!impress.isMaster) {
    cloud.role = 'client';
    cloud.connectClient();
  } else {
    const target = impress.config.sections.scale.host + ':' +
      impress.config.sections.scale.port;
    const message = 'Connect to Cloud Controller ' + target;
    impress.log.system(message);
  }
};

// Setup event and state event handlers
//   connection <Object> JSTP connection
const setupEventHandlers = connection => {
  connection.on('event', event => {
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

// Initialize Impress Cloud Controller
cloud.setupServer = () => {
  const server = impress.config.sections.servers.master;
  if (!server) return;
  cloud.server = server.instance;
  cloud.status = 'online';
  cloud.server.on('connect', connection => {
    setupEventHandlers(connection);
  });
};

// Initialize Impress Cloud Node
cloud.connectClient = () => {
  let target;
  if (impress.config.sections.scale.instance === 'server') {
    target = impress.config.sections.scale.controller;
  } else {
    const master = impress.config.sections.servers.master;
    target = {
      host: master.address,
      port: master.ports[0]
    };
  }

  const client = {
    application: impress,
    connectPolicy: new api.jstp.SimpleConnectPolicy(
      impress.nodeId, impress.config.sections.scale.key
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

    connection.on('error', err => {
      impress.log.error('Cloud Controller connection error: ' + err);
    });
  });
};

// Send an event over JSTP
//   eventName <string>
//   eventArgs <Array>
const emitRemoteEvent = (eventName, eventArgs) => {
  if (cloud.connection) {
    cloud.connection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else if (eventArgs.to) {
    const targetConnection = cloud.connections[eventArgs.to];
    targetConnection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else {
    const nodeIds = Object.keys(cloud.connections);
    for (let i = 0; i < nodeIds.length; i++) {
      const connection = cloud.connections[nodeIds[i]];
      connection.emitRemoteEvent('cloud', eventName, eventArgs);
    }
  }
};

// Send event
//   app <string> application name
//   name <string> event name
//   data <Object> attached data
//   target <string> target name
//   to <string> destination name
cloud.event = (app, name, data, target, to) => {
  if (cloud.status !== 'online') return;
  const event = { from: impress.nodeId, app, name, target, to, data };
  emitRemoteEvent('impressEvent', event);
};

// Send state
//   app <string> application name
//   data <Object> attached data
cloud.state = (app, data) => {
  if (cloud.status !== 'online') return;
  const delta = { from: impress.nodeId, app, data };
  emitRemoteEvent('state', delta);
};

// Send health
cloud.health = () => {};

cloud.event = event => {
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

cloud.state = delta => {
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

const mixin = application => {

  application.sendEventToNode = (eventName, data, nodeId) => cloud.event(
    application.name, eventName, data, 'backend', nodeId
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
  mixinApplication: mixin,
};
