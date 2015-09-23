'use strict';

// Server-Sent Events pligin for Impress Application Server
//
impress.sse = {};

var SSE_CONNECTED = new Buffer(':' + new Array(2049).join(' ') + '\n\n', 'utf8'),
    SSE_SET_RETRY = new Buffer('retry: 2000\n\n', 'utf8'),
    SSE_HEARTBEAT = new Buffer(':\n\n', 'utf8'),
    SSE_HB_INTERVAL = 10000;

impress.sse.mixinApplication = function(application) {

  application.sse = {
    nextConnectionId: 1, // counter to be used as connection identifier
    connections: {},     // all SSE connections
    statistics: {
      incoming: 0,     // incoming connection count from server start
      active: 0,       // active connection count
      disconnected: 0, // disconnected connection count from server start
      errors: 0        // connection error count from server start
    }
  };

  application.sse.heartbeat = setInterval(function() {
    var connection, connections = application.sse.connections;
    for (var connectionId in connections) {
      connection = connections[connectionId];
      if (connection.heartbeat && !connection.res.finished) connection.res.write(SSE_HEARTBEAT);
    }
  }, SSE_HB_INTERVAL);

  // Initialize SSE connection
  //
  application.Client.prototype.sseConnect = function() {
    var client = this;

    if (client.eventChannel && !client.res.headersSent) {
      client.accessLog();
      client.res.writeHead(200, {
        'Content-Type': impress.MIME_TYPES['sse'],
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*'
      });

      client.socket.setNoDelay(true);
      client.socket.setTimeout(0);
      client.res.write(SSE_CONNECTED);
      client.res.write(SSE_SET_RETRY);

      var connectionId = application.sse.nextConnectionId++;
      client.sseConnectionId = connectionId;

      var user = client.user;
      if (user) user.sse[connectionId] = client;
      application.sse.connections[connectionId] = client;

      var channel = application.channels[client.eventChannel];
      if (!channel) {
        channel = [];
        application.channels[client.eventChannel] = channel;
      }
      if (user && !api.impress.inArray(channel, user.login)) channel.push(user.login);

      application.sse.statistics.incoming++;
      application.sse.statistics.active++;

      client.req.on('close', function() {
        application.emit('clientDisconnect', client);

        delete application.sse.connections[connectionId];
        application.sse.statistics.active--;
        application.sse.statistics.disconnected++;
      });

      var onDrop = function() {
        application.emit('clientDisconnect', client);

        application.sse.statistics.active--;
        application.sse.statistics.disconnected++;
        application.sse.statistics.errors++;
      };

      client.req.on('error', onDrop);
      client.req.on('timeout', onDrop);
      client.socket.on('timeout', onDrop);

    } else client.error(403);
  };

  // Send event to all connections of given user
  //
  application.sse.sendToUser = function(login, eventName, data) {
    var buf = impress.sse.packet(eventName, data),
        user = application.users[login],
        res;
    if (user && user.sse) {
      for (var key in user.sse) {
        res = user.sse[key].res;
        if (!res.finished) res.write(buf);
      }
    }
  };

  // Send event to all users in channel
  //
  application.sse.sendToChannel = function(channel, eventName, data) {
    var login, user,
        buf = impress.sse.packet(eventName, data),
        logins = application.channels[channel],
        res;
    for (var j = 0, jlen = logins.length; j < jlen; j++) {
      login = logins[j];
      user = application.users[login];
      if (user && user.sse) {
        for (var i = 0, ilen = user.sse.length; i < ilen; i++) {
          res = user.sse[i].res;
          if (!res.finished) res.write(buf);
        }
      }
    }
  };

  // Send event to all users in system
  //
  application.sse.sendGlobal = function(eventName, data) {
    var buf = impress.sse.packet(eventName, data),
        res, connections = application.sse.connections;
    for (var connectionId in connections) {
      res = connections[connectionId].res;
      if (!res.finished) res.write(buf);
    }
  };

};

// Create SSE packet buffer
//
impress.sse.packet = function(eventName, data) {
  return new Buffer(
    'event: ' + eventName + '\n' +
    'data: ' + JSON.stringify(data) + '\n\n',
    'utf8'
  );
};
