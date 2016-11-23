'use strict';

impress.jstp = {};

impress.jstp.mixImpress = true;

// Create a JSTP server
//   config - Impress server worker configuration
//
impress.jstp.createServer = function(config) {
  var transport;

  if (config.transport === 'tcp' || config.transport === 'tls') {
    transport = api.jstp.tcp;
  } else if (config.transport === 'ws' || config.transport === 'wss') {
    transport = api.jstp.ws;
  } else {
    return null;
  }

  var apps;
  var auth;

  if (config.name === 'master') {
    apps = { impress: impress };
    auth = impress.cloud.startSession;
  } else {
    apps = impress.applications;
    auth = impress.jstp.startSession;
  }

  if (config.transport === 'tls' || config.transport === 'wss') {
    config = api.common.extend({}, config);
    api.common.extend(config, impress.loadCertificates(config));
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
  application.callMethod = function(connection, interfaceName,
                                    methodName, args, callback) {
    var appInterface = application.api[interfaceName];
    if (!appInterface) {
      return callback(api.jstp.ERR_INTERFACE_NOT_FOUND);
    }

    var method = appInterface[methodName];
    if (!method) {
      return callback(api.jstp.ERR_METHOD_NOT_FOUND);
    }

    application.sandbox.connection = connection;
    method.apply(null, args.concat([callback]));
  };

  // Get an array of methods of an interface
  //   interfaceName - name of the interface to inspect
  //
  application.getMethods = function(interfaceName) {
    var appInterface = application.api[interfaceName];

    if (appInterface) {
      return Object.keys(appInterface);
    } else {
      return null;
    }
  };
};

// JSTP authentication callback
//
impress.jstp.startSession = function(connection, application,
                                     username, password, callback) {
  if (username) {
    return callback(api.jstp.ERR_AUTH_FAILED);
  }

  var sessionId = api.common.generateGUID();
  application.connections[sessionId] = connection;

  connection.on('close', function() {
    delete application.connections[sessionId];
  });

  callback(null, sessionId);
};
