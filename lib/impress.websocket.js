'use strict';

// Websocket plugin for Impress Application Server
//
api.websocket = api.impress.require('websocket');

if (api.websocket) {

  impress.websocket = api.websocket;

  // Upgrade HTTP server to support websocket
  //
  impress.websocket.upgradeServer = function(server) {

    server.webSocketServer = new api.websocket.server({
      httpServer: server,
      autoAcceptConnections: false
    });

    server.webSocketServer.on('request', function(request) {
      var req = request.httpRequest,
          res = request.socket;
      res.websocket = {};
      res.websocket.request = request;

      var client = impress.dispatcher(req, res),
          application = client.application;
      application.emit('connect', client);
    });

  };

  // Websocket Application pligin definition
  //
  impress.websocket.mixinApplication = function(application) {

    application.websocket = {};

    // Websocket initialization (to be called automatically by Impress core)
    //
    application.websocket.initialize = function(client) {

      if (client.res.websocket) client.websocket = client.res.websocket;
      else {
        client.websocket = { fake: true };
        client.error(400);
      }

      // Accept websocket connection
      //
      client.websocket.accept = function() {
        client.websocket.isAccepted = true;
        client.res.statusCode = 101;
        client.accessLog();
        if (client.websocket.fake) return;
        return client.websocket.request.accept('', client.websocket.request.origin);
      };

    };

    // Finalize websocket connection
    //
    application.websocket.finalize = function(client) {
      var ws = client.websocket;
      if (ws && !ws.isAccepted) ws.request.reject();
    };

  };

}
