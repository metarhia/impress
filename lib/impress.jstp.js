'use strict';

impress.jstp = {};

impress.jstp.appsProvider = new ApplicationsProvider();
impress.jstp.masterAppProvider = new MasterApplicationProvider();

impress.jstp.authProvider = api.jstp.simpleAuthProvider;
impress.jstp.masterAuthProvider = {};

// Create a JSTP server
//   config - Impress server worker configuration
//
impress.jstp.createServer = function(config) {
  var protocol = config.protocol;
  var transport;

  if (protocol === 'jstp' || protocol === 'jstps') {
    transport = api.jstp.tcp;
  } else if (protocol === 'jstp-ws' || protocol === 'jstp-wss') {
    transport = api.jstp.ws;
  } else {
    return null;
  }

  var appsProvider;
  var authProvider;

  if (config.name === 'master') {
    var instanceType = impress.config.scale.instance;

    if (instanceType === 'server') {
      appsProvider = impress.jstp.masterAppProvider;
      authProvider = impress.jstp.masterAuthProvider;
    } else {
      appsProvider = impress.cloud.controllerAppProvider;
      authProvider = impress.cloud.controllerAuthProvider;
    }
  } else {
    appsProvider = impress.jstp.appsProvider;
    authProvider = impress.jstp.authProvider;
  }

  if (protocol === 'jstps' || protocol === 'jstp-wss') {
    var config = api.common.extend({}, config)
    api.common.extend(config, impress.loadCertificates(config));
  }

  return transport.createServer(config, appsProvider, authProvider);
};

// Anonymous handshake handler for the master server
//   connection - JSTP connection
//   application - Cloud Controller JSTP application
//   callback - callback function
//
impress.jstp.masterAuthProvider.startAnonymousSession =
  function(connection, application, callback) {
    callback(api.jstp.ERR_AUTH_FAILED);
  };

// Authenticated handshake handler for the master server
//   connection - JSTP connection
//   application - Cloud Controller JSTP application
//   workerId - worker name
//   cloudAccessKey - cloud access key
//   callback - callback function
//
impress.jstp.masterAuthProvider.startAuthenticatedSession =
  function(connection, application, workerId, cloudAccessKey, callback) {
    if (cloudAccessKey !== impress.config.scale.key) {
      return callback(api.jstp.ERR_AUTH_FAILED);
    }

    callback(null, api.common.generateGUID());
  };

// JSTP application adapter
//   name - application name
//   application - Impress application
//
function JstpApplication(name, application) {
  this.name = name;
  this._application = application;
}

// Call application method
//   connection - JSTP connection
//   interfaceName - name of the interface
//   methodName - name of the method
//   args - method arguments (including callback)
//
JstpApplication.prototype.callMethod =
  function(connection, interfaceName, methodName, args) {
    var appInterface = this._application.api[interfaceName];
    if (!appInterface) {
      throw new api.jstp.RemoteError(api.jstp.ERR_INTERFACE_NOT_FOUND);
    }

    var method = appInterface[methodName];
    if (!method) {
      throw new api.jstp.RemoteError(api.jstp.ERR_METHOD_NOT_FOUND);
    }

    this._application.sandbox.connection = connection;
    method.apply(null, args);
  };

// Get an array of methods of an interface
//   interfaceName - name of the interface to inspect
//
JstpApplication.prototype.getMethods = function(interfaceName) {
  var appInterface = this._application.api[interfaceName];

  if (appInterface) {
    return Object.keys(appInterface);
  } else {
    return null;
  }
};

// JSTP applications provider
//
function ApplicationsProvider() {
  this._applications = {};
}

// Get a JSTP application
//   appName - name of the application
//
ApplicationsProvider.prototype.getApplication = function(appName) {
  var jstpApplication = this._applications[appName];

  if (!jstpApplication) {
    var impressApplication = impress.applications[appName];

    if (!impressApplication) {
      return null;
    }

    jstpApplication = new JstpApplication(appName, impressApplication);
    this._applications[appName] = jstpApplication;
  }

  return jstpApplication;
};

// System application provider for the master server
//
function MasterApplicationProvider() {
  this._application = new api.jstp.Application('impress', {});
}

// Get a JSTP application
//   appName - name of the application
//
MasterApplicationProvider.prototype.getApplication = function(appName) {
  if (appName === 'impress') {
    return this._application;
  }
};
