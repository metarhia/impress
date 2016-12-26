'use strict';

// Websocket plugin for Impress Application Server
//
api.websocket = api.registry.require('websocket');

impress.websocket = api.websocket;

var WebsocketServer = api.websocket.server;

// Upgrade HTTP server to support websocket
//
impress.websocket.upgradeServer = function(server) {

  server.webSocketServer = new WebsocketServer({
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

// Websocket Application plugin definition
//
impress.websocket.mixin = function(application) {

  // Websocket initialization (to be called automatically by Impress core)
  //
  application.websocket.initialize = function(client) {

    var ws;
    if (client.res.websocket) {
      ws = client.res.websocket;
      client.websocket = ws;
    } else {
      ws = { fake: true };
      client.websocket = ws;
      client.error(400);
    }

    // Accept websocket connection
    //
    ws.accept = function() {
      ws.isAccepted = true;
      client.res.statusCode = 101;
      client.accessLog();
      if (ws.fake) return;
      return ws.request.accept('', ws.request.origin);
    };

  };

  // Finalize websocket connection
  //
  application.websocket.finalize = function(client) {
    var ws = client.res.websocket;
    if (ws && !ws.isAccepted) {
      ws.request.reject();
    }
  };

};
