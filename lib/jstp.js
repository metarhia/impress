'use strict';

const jstp = {};
impress.jstp = jstp;

// Create JSTP Server
//   server <Object>
jstp.createServer = server => {
  const { name, config } = server;
  const { transport } = config;

  const transportModule = transport === 'tcp' ? 'net' : transport;
  const jstpTransport = api.jstp[transportModule];
  if (!jstpTransport) return null;

  if (name === 'master') {
    impress.version = impress.version || '1.0.0';
    config.applications = [impress];
    config.authPolicy = api.cloud.authenticate;
  } else {
    config.applications = jstp.prepareApplications();
  }

  if (transport === 'tls' || transport === 'wss') {
    const cert = impress.loadCertificates(config);
    if (!cert) return null;
    Object.assign(config, cert);
  }

  const instance = jstpTransport.createServer(config, jstp.startLogging);

  instance.on('log', (...args) => {
    jstp.logger(...args);
  });

  return instance;
};

const mixin = application => {

  // JSTP connections
  application.connections = new Map();

  // Call application method
  //   connection <Object> connection instance
  //   interfaceName <string> name of the interface
  //   methodName <string> name of the method
  //   args <Array> method arguments (including callback)
  //   callback <Function>
  application.callMethod = (
    connection, interfaceName, methodName, args, callback
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

      args = args.map(arg => api.mdsf.stringify(arg)).join(' ');

      impress.log.access(
        application.name + '\tcall\t' +
        `${interfaceName}.${methodName}\t${args}\t${timeMillisec} ms\t` +
        connection.session.id
      );

      callback(...callbackArgs);
    });
  };

  // Get an array of methods of an interface
  //   interfaceName <string> name of the interface to inspect
  application.getMethods = interfaceName => {
    const appInterface = application.api[interfaceName];
    if (!appInterface) return null;
    return Object.keys(appInterface);
  };
};

jstp.prepareApplications = () => Object.keys(impress.applications)
  .map(key => {
    const application = impress.applications[key];
    application.version = application.version || '1.0.0';
    return application;
  });

jstp.logger = (connection, event, ...args) => {
  args = args.map(arg => api.mdsf.stringify(arg)).join(' ');

  let message = `${event}: ${args}`;
  if (connection.session) {
    message += `\t${connection.session.username}\t${connection.session.id}`;
  }
  message += `\t${connection.remoteAddress}`;

  impress.log.info(message); // access
};

module.exports = {
  mixinImpress: mixin,
  mixinApplication: mixin,
};
