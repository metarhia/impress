"use strict";

var websocket = impress.require('websocket');

if (websocket) {

  api.websocket = websocket;
  impress.websocket = {};

  impress.websocket.upgradeServer = function(server) {
    server.webSocketServer = new websocket.server({
      httpServer: server,
      autoAcceptConnections: false
    });
    server.webSocketServer.on('request', function(request) {
      var req = request.httpRequest,
          res = request.socket;
      res.websocket = {};
      res.websocket.request = request;
      res.websocket.accept = function() {
        res.websocket.isAccepted = true;
        return request.accept('', request.origin);
      };
      impress.dispatcher(req, res);
    });
  };

  impress.websocket.mixinApplication = function (application) {

    application.websocket = {};

    application.websocket.finalize = function(client) {
      var ws = client.res.websocket;
      if (ws && !ws.isAccepted) ws.request.reject();
    };

  };

}
