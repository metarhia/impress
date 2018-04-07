'use strict';

const jstp = {};
impress.jstp = jstp;

jstp.createServer = (
  config // Impress server worker configuration
) => {
  const transportModule = config.transport === 'tcp' ? 'net' : config.transport;
  const transport = api.jstp[transportModule];
  if (!transport) {
    return null;
  }

  if (config.name === 'master') {
    impress.version = impress.version || '1.0.0';
    config.applications = [impress];
    config.authPolicy = api.cloud.authenticate;
  } else {
    config.applications = jstp.prepareApplications();
  }

  if (config.transport === 'tls' || config.transport === 'wss') {
    const cert = impress.loadCertificates(config);
    if (!cert) {
      return null;
    }
    config = Object.assign({}, config, cert);
  }

  const server = transport.createServer(config, jstp.startLogging);

  server.on('log', (...args) => {
    jstp.logger(...args);
  });

  return server;
};

const mixin = (application) => {
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
      callback(api.jstp.ERR_INTERFACE_NOT_FOUND);
      return;
    }

    let method = appInterface[methodName];
    if (!method) {
      callback(api.jstp.ERR_METHOD_NOT_FOUND);
      return;
    }

    method = method(connection);

    if (method.length !== args.length + 1) {
      callback(api.jstp.ERR_INVALID_SIGNATURE);
      return;
    }

    const startTime = process.hrtime();

    method(...args, (...callbackArgs) => {
      const executionTime = process.hrtime(startTime);
      const timeMillisec = (executionTime[0] * 1e9 + executionTime[1]) / 1e6;

      args = args.map(arg => api.jstp.stringify(arg)).join(' ');

      impress.log.access(
        application.name + '\tcall\t' +
        `${interfaceName}.${methodName}\t${args}\t${timeMillisec} ms\t` +
        connection.session.id
      );

      callback(...callbackArgs);
    });
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

jstp.prepareApplications = () => Object.keys(impress.applications)
  .map((key) => {
    const application = impress.applications[key];
    application.version = application.version || '1.0.0';
    return application;
  });

jstp.logger = (connection, event, ...args) => {
  args = args.map(arg => api.jstp.stringify(arg)).join(' ');

  let message = `${event}: ${args}`;
  if (connection.session) {
    message += `\t${connection.session.username}\t${connection.session.id}`;
  }
  message += `\t${connection.remoteAddress}`;

  impress.log.info(message); // access
};

module.exports = {
  mixinImpress: mixin,
  mixinApplication: mixin
};
