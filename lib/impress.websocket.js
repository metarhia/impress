'use strict';

// Websocket plugin for Impress Application Server

api.websocket = api.registry.require('websocket');

impress.websocket = api.websocket;

const WebsocketServer = api.websocket.server;

// Upgrade HTTP server to support websocket

impress.websocket.upgradeServer = (server) => {

  server.webSocketServer = new WebsocketServer({
    httpServer: server,
    autoAcceptConnections: false
  });

  server.webSocketServer.on('request', (request) => {
    const req = request.httpRequest;
    const res = request.socket;
    res.websocket = {};
    res.websocket.request = request;

    const client = impress.dispatcher(req, res);
    const application = client.application;
    application.emit('connect', client);
  });

};

impress.websocket.mixin = (application) => {

  application.websocket.initialize = (client) => {
    let ws;
    if (client.res.websocket) {
      ws = client.res.websocket;
      client.websocket = ws;
    } else {
      ws = { fake: true };
      client.websocket = ws;
      client.error(400);
    }

    ws.accept = (cookies) => {
      ws.isAccepted = true;
      client.res.statusCode = 101;
      client.accessLog();
      if (ws.fake) return;
      ws.request.accept('', ws.request.origin, cookies);
    };
  };

  application.websocket.finalize = (client) => {
    const ws = client.res.websocket;
    if (ws && !ws.isAccepted) {
      ws.request.reject();
    }
  };

};
