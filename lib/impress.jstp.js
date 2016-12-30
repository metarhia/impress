'use strict';

impress.jstp = {};

impress.jstp.mixImpress = true;

// Create a JSTP server
//   config - Impress server worker configuration
//
impress.jstp.createServer = function(config) {
  let transport;

  if (config.transport === 'tcp' || config.transport === 'tls') {
    transport = api.jstp.tcp;
  } else if (config.transport === 'ws' || config.transport === 'wss') {
    transport = api.jstp.ws;
  } else {
    return null;
  }

  let apps;
  let auth;

  if (config.name === 'master') {
    apps = { impress };
    auth = impress.cloud.startSession;
  } else {
    apps = impress.applications;
    auth = impress.jstp.startSession;
  }

  if (config.transport === 'tls' || config.transport === 'wss') {
    config = Object.assign({}, config, impress.loadCertificates(config));
  }

  return transport.createServer(config, apps, auth);
};

// Impress application mixin
//   application - Impress application to be extended to the interface
//                 of a JSTP application
//
impress.jstp.mixin = function(application) {
  // JSTP connections
  application.connections = {};

  // Call application method
  //   connection - JSTP connection
  //   interfaceName - name of the interface
  //   methodName - name of the method
  //   args - method arguments (including callback)
  //
  application.callMethod = function(
    connection, interfaceName, methodName, args, callback
  ) {
    const appInterface = application.api[interfaceName];
    if (!appInterface) {
      return callback(api.jstp.ERR_INTERFACE_NOT_FOUND);
    }

    const method = appInterface[methodName];
    if (!method) {
      return callback(api.jstp.ERR_METHOD_NOT_FOUND);
    }

    if (method.length !== args.length + 1) {
      return callback(api.jstp.ERR_INVALID_SIGNATURE);
    }

    const startTime = process.hrtime();

    application.sandbox.connection = connection;
    method(...args.concat([onComplete]));

    function onComplete(...args) {
      const executionTime = process.hrtime(startTime);
      const timeMillisec = (executionTime[0] * 1e9 + executionTime[1]) / 1e6;

      const logMessage = (
        interfaceName + '.' + methodName + '\t' +
        timeMillisec + ' ms\t' +
        connection.username + '\t' +
        connection.sessionId + '\t' +
        connection.remoteAddress
      );

      application.log.api(logMessage);

      callback(...args);
    }
  };

  // Get an array of methods of an interface
  //   interfaceName - name of the interface to inspect
  //
  application.getMethods = function(interfaceName) {
    const appInterface = application.api[interfaceName];

    if (appInterface) {
      return Object.keys(appInterface);
    } else {
      return null;
    }
  };
};

// JSTP authentication callback
//
impress.jstp.startSession = function(
  connection, application, username, password, callback
) {
  if (username) {
    return callback(api.jstp.ERR_AUTH_FAILED);
  }

  const sessionId = api.common.generateSID(application.config);
  application.connections[sessionId] = connection;

  connection.on('close', () => {
    delete application.connections[sessionId];
  });

  callback(null, sessionId);
};
