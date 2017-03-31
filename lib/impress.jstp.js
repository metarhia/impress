'use strict';

impress.jstp = {};

impress.jstp.mixImpress = true;

impress.jstp.createServer = (
  config // Impress server worker configuration
) => {
  let transport;

  if (config.transport === 'tcp' || config.transport === 'tls') {
    transport = api.jstp.tcp;
  } else if (config.transport === 'ws' || config.transport === 'wss') {
    transport = api.jstp.ws;
  } else {
    return null;
  }

  let apps, auth;
  if (config.name === 'master') {
    apps = { impress };
    auth = impress.cloud.startSession;
  } else {
    apps = impress.applications;
    auth = impress.jstp.startSession;
  }

  if (config.transport === 'tls' || config.transport === 'wss') {
    const cert = impress.loadCertificates(config);
    if (!cert) return;
    config = Object.assign({}, config, cert);
  }

  return transport.createServer(config, apps, auth);
};

impress.jstp.mixin = (application) => {
  // JSTP connections
  application.connections = new Map();

  application.callMethod = (
    // Call application method
    connection, // connection instance
    interfaceName, // name of the interface
    methodName, // name of the method
    args, // method arguments (including callback)
    callback
  ) => {
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

    method(connection)(...args.concat([onComplete]));

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

  application.getMethods = (
    // Get an array of methods of an interface
    interfaceName // name of the interface to inspect
  ) => {
    const appInterface = application.api[interfaceName];
    if (!appInterface) return null;
    return Object.keys(appInterface);
  };
};

impress.jstp.startSession = (
  // JSTP authentication callback
  connection, // connection instance
  application, // application name
  username, // string
  password, // string
  callback // function
) => {
  if (username) {
    return callback(api.jstp.ERR_AUTH_FAILED);
  }

  const sid = api.common.generateSID(application.config.sessions);
  application.connections.set(sid, connection);

  connection.on('close', () => {
    application.connections.delete(sid);
  });

  callback(null, sid);
};
