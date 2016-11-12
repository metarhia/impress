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

  var appsProvider;
  var authProvider;

  if (config.name === 'master') {
    appsProvider = impress.cloud.appProvider;
    authProvider = impress.cloud.authProvider;
  } else {
    appsProvider = impress.jstp.appsProvider;
    authProvider = impress.jstp.authProvider;
  }

  if (config.transport === 'tls' || config.transport === 'wss') {
    config = api.common.extend({}, config);
    api.common.extend(config, impress.loadCertificates(config));
  }

  return transport.createServer(config, appsProvider, authProvider);
};

// Impress application mixin
//   application - Impress application to be extended to the interface
//                 of a JSTP application
//
impress.jstp.mixin = function(application) {
  // Call application method
  //   connection - JSTP connection
  //   interfaceName - name of the interface
  //   methodName - name of the method
  //   args - method arguments (including callback)
  //
  application.callMethod = function(connection, interfaceName, methodName, args) {
    var callback = args[args.length - 1];

    var appInterface = application.api[interfaceName];
    if (!appInterface) {
      return callback(api.jstp.ERR_INTERFACE_NOT_FOUND);
    }

    var method = appInterface[methodName];
    if (!method) {
      return callback(api.jstp.ERR_METHOD_NOT_FOUND);
    }

    application.sandbox.connection = connection;
    method.apply(null, args);
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

// JSTP authentication provider
//
impress.jstp.authProvider = api.jstp.simpleAuthProvider;

// JSTP applications provider
//
impress.jstp.appsProvider = {};

// Get an application
//   appName - name of the application
//
impress.jstp.appsProvider.getApplication = function(appName) {
  return impress.applications[appName];
};
