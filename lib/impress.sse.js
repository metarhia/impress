"use strict";

impress.sse = {};

var initBuf = new Buffer(':\n\n', 'utf8');

impress.sse.mixinApplication = function (application) {

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

  // Initialize SSE connection
  //
  application.Client.prototype.sseConnect = function() {
    var client = this,
        userId = null;

    if (client.session && client.logged) {
      var uid = client.session.userId;
      if (uid.toHexString) userId = uid.toHexString();
      else userId = uid;
    }

    if (client.eventChannel && !client.res.headersSent) {
      client.res.writeHead(200, {
        'Content-Type': impress.mimeTypes['sse'],
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*'
      });
      client.req.socket.setTimeout(0);
      client.res.write(initBuf);

      var connectionId = application.sse.nextConnectionId++;
      client.sseConnectionId = connectionId;

      if (userId) {
        var user = client.application.users[userId];
        if (user) {
          if (!user.sse) user.sse = {};
          user.sse[connectionId] = client;
        }
      }
      application.sse.connections[connectionId] = client;

      var channel = application.events.channels[client.eventChannel];
      if (!channel) {
        channel = [];
        application.events.channels[client.eventChannel] = channel;
      }
      if (!inArray(channel, userId)) channel.push(userId);

      application.sse.statistics.incoming++;
      application.sse.statistics.active++;

      client.req.on('close', function() {
        delete application.sse.connections[connectionId];
        application.sse.statistics.active--;
        application.sse.statistics.disconnected++;
      });

      var onDrop = function() {
        application.sse.statistics.active--;
        application.sse.statistics.disconnected++;
        application.sse.statistics.errors++;
      };

      client.req.on('error', onDrop);
      client.req.on('timeout', onDrop);
      client.req.socket.on('timeout', onDrop);

    } else client.error(403);
  };

  // Send event to all connections of given user
  //
  application.sse.sendToUser = function(userId, eventName, data) {
    var buf = impress.sse.packet(eventName, data),
        user = application.users[userId];
    if (user && user.sse) for (var i in user.sse) user.sse[i].res.write(buf);
  };

  // Send event to all users in channel
  //
  application.sse.sendToChannel = function(channel, eventName, data) {
    var buf = impress.sse.packet(eventName, data),
        userId, user, userIds = application.sse.channels[channel];
    for (var j = 0; j < userIds.length; j++) {
      userId = userIds[j];
      user = application.users[userId];
      if (user && user.sse) {
        for (var i = 0; i < user.sse.length; i++) user.sse[i].res.write(buf);
      }
    }
  };

  // Send event to all users in system
  //
  application.sse.sendGlobal = function(eventName, data) {
    var buf = impress.sse.packet(eventName, data),
        connection, connections = application.sse.connections;
    for (var connectionId in connections) {
      connection = connections[connectionId];
      connection.res.write(buf);
    }
  };

};

// Create SSE packet buffer
//
impress.sse.packet = function(eventName, data) {
  return new Buffer(
    'event: '+eventName+'\n'+
    'data: '+api.stringify(data)+'\n\n',
    'utf8'
  );
};
