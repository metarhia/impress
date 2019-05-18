'use strict';

// Cloud RPC for Impress Application Server

const RECONNECT_TIMEOUT = 7000;

// Setup event and state event handlers
//   connection <Object> JSTP connection
const setupEventHandlers = connection => {
  connection.on('event', (interfaceName, name, args) => {
    if (interfaceName !== 'cloud') return;
    if (name === 'impressEvent') {
      api.cloud.event(args);
    } else if (name === 'state') {
      api.cloud.state(args);
    }
  });
};

// Send an event over JSTP
//   eventName <string>
//   eventArgs <Array>
const emitRemoteEvent = (eventName, eventArgs) => {
  const connection = api.cloud.connection;
  if (connection) {
    connection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else if (eventArgs.to) {
    const targetConnection = api.cloud.connections[eventArgs.to];
    targetConnection.emitRemoteEvent('cloud', eventName, eventArgs);
  } else {
    Object.entries(api.cloud.connections).forEach(([nodeId, connection]) => {
      if (nodeId !== eventArgs.from) {
        connection.emitRemoteEvent('cloud', eventName, eventArgs);
      }
    });
  }
};

class Cloud extends api.events.EventEmitter {

  constructor() {
    super();
    this.connections = {}; // keyed by nodeId
    this.status = 'offline';
    // 'offline', 'connecting', 'sleep', 'online', 'error', 'maintenance'
  }

  // Authenticated handshake handler for Impress Cloud Controller
  //   connection <Object> JSTP connection
  //   application <Object> Cloud Controller JSTP application
  //   strategy <string> JSTP authentication strategy
  //   nodeId <string> server name
  //   cloudAccessKey <string> cloud access key
  //   callback <Function>
  // Hint: don't use this function
  authenticate(
    connection, application, strategy, [nodeId, cloudAccessKey], callback
  ) {
    const key = impress.config.sections.scale.key;
    if (strategy !== 'login' || cloudAccessKey !== key) {
      callback(api.jstp.ERR_AUTH_FAILED);
      return;
    }
    api.cloud.connections[nodeId] = connection;
    callback(null, nodeId);
  }

  // Init connection
  init() {
    if (this.status === 'online') return;
    this.status = 'connecting';
    const config = impress.config.sections.scale;
    const scaleInstance = config.instance;
    if (impress.isMaster && scaleInstance !== 'server') {
      this.role = 'server';
      this.setupMaster();
    } else if (!impress.isMaster) {
      this.role = 'client';
      this.connectClient();
    } else {
      const target = config.host + ':' + config.port;
      const message = 'Connect to Cloud Controller ' + target;
      impress.log.system(message);
    }
  }

  // Initialize Impress Cloud Controller
  setupMaster() {
    const server = impress.server;
    if (!server) return;
    const instance = server.instance;
    if (!instance) return;
    this.server = instance;
    this.status = 'online';
    this.server.on('connect', connection => {
      setupEventHandlers(connection);
    });
  }

  // Initialize Impress Cloud Node
  connectClient() {
    let target;
    const config = impress.config.sections.scale;
    if (config.instance === 'server') {
      target = config.controller;
    } else {
      const master = impress.config.sections.servers.master;
      target = { host: master.address, port: master.ports[0] };
    }

    const client = {
      application: impress,
      connectPolicy: new api.jstp.SimpleConnectPolicy(
        impress.nodeId, config.key
      ),
    };

    api.jstp.net.connect('impress', client, target, (err, connection) => {
      if (err) {
        this.status = 'offline';
        impress.log.error('Cannot connect to Cloud Controller: ' + err);
        return;
      }
      this.status = 'online';
      this.connection = connection;
      setupEventHandlers(connection);

      connection.on('close', () => {
        if (impress.finalization || this.status !== 'online') return;
        this.status = 'offline';
        impress.log.warn('Connection lost, reconnecting...');
        setTimeout(this.init, RECONNECT_TIMEOUT);
      });

      connection.on('error', err => {
        impress.log.error('Cloud Controller connection error: ' + err);
      });
    });
  }

  // Send event
  //   app <string> application name
  //   name <string> event name
  //   data <Object> attached data
  //   target <string> target name
  //   to <string> destination name
  sendEvent(app, name, data, target, to) {
    if (this.status !== 'online') return;
    const event = { from: impress.nodeId, app, name, target, to, data };
    emitRemoteEvent('impressEvent', event);
  }

  // Send state
  //   app <string> application name
  //   data <Object> attached data
  sendState(app, data) {
    if (this.status !== 'online') return;
    const delta = { from: impress.nodeId, app, data };
    emitRemoteEvent('state', delta);
  }

  // Send health
  health() {
  }

  event(event) {
    if (this.role === 'server' && impress.nodeId !== event.to) {
      emitRemoteEvent('impressEvent', event);
    } else {
      if (event.to && impress.nodeId !== event.to) return;
      const application = impress.applications[event.app];
      if (application) {
        application.cloud.emitLocal(event.name, event.data);
      }
    }
  }

  state(delta) {
    const isTarget = this.role === 'client';
    if (!isTarget) {
      emitRemoteEvent('state', delta);
    } else {
      const application = impress.applications[delta.app];
      if (application && application.state) {
        application.state.emit('change', delta.data, isTarget);
      }
    }
  }
}

class CloudEmitter extends api.common.EnhancedEmitter {

  constructor(application) {
    super();
    this.application = application;

    application.state.on('change', (data, isTarget) => {
      if (!isTarget) {
        api.cloud.sendState(application.name, data);
      }
    });
  }

  emitLocal(eventName, data) {
    super.emit(eventName, data);
  }

  emit(eventName, data) {
    this.emitLocal(eventName, data);
    api.cloud.sendEvent(this.application.name, eventName, data);
  }
}

api.cloud = new Cloud();
api.cloud.CloudEmitter = CloudEmitter;
