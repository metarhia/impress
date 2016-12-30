'use strict';

// Server-Sent Events plugin for Impress Application Server

const SSE_PADDING = ':' + new Array(2049).join(' ') + '\n\n';
const SSE_CONNECTED = Buffer.from(SSE_PADDING, 'utf8');
const SSE_SET_RETRY = Buffer.from('retry: 2000\n\n', 'utf8');
const SSE_HEARTBEAT = Buffer.from(':\n\n', 'utf8');
const SSE_HB_INTERVAL = 10000;

impress.sse.mixin = (application) => {

  application.sse.nextConnectionId = 1; // counter, connection identifier
  application.sse.connections = {};     // all SSE connections
  application.sse.statistics = {
    incoming: 0,     // incoming connection count from server start
    active: 0,       // active connection count
    disconnected: 0, // disconnected connection count from server start
    errors: 0        // connection error count from server start
  };

  application.sse.heartbeat = api.timers.setInterval(() => {
    let connectionId, connection;
    const connections = application.sse.connections;
    for (connectionId in connections) {
      connection = connections[connectionId];
      if (connection.heartbeat && !connection.res.finished) {
        connection.res.write(SSE_HEARTBEAT);
      }
    }
  }, SSE_HB_INTERVAL);

  // Initialize SSE connection
  //
  impress.Client.prototype.sseConnect = function() {
    const client = this;

    if (client.eventChannel && !client.res.headersSent) {
      client.accessLog();
      client.res.writeHead(200, {
        'Content-Type': impress.MIME_TYPES.sse,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*'
      });

      client.socket.setNoDelay(true);
      client.socket.setTimeout(0);
      client.res.write(SSE_CONNECTED);
      client.res.write(SSE_SET_RETRY);

      const connectionId = application.sse.nextConnectionId++;
      client.sseConnectionId = connectionId;

      const user = client.user;
      if (user) user.sse[connectionId] = client;
      application.sse.connections[connectionId] = client;

      let channel = application.channels[client.eventChannel];
      if (!channel) {
        channel = [];
        application.channels[client.eventChannel] = channel;
      }
      if (user && !channel.includes(user.login)) {
        channel.push(user.login);
      }

      application.sse.statistics.incoming++;
      application.sse.statistics.active++;

      client.req.on('close', () => {
        application.emit('clientDisconnect', client);

        delete application.sse.connections[connectionId];
        application.sse.statistics.active--;
        application.sse.statistics.disconnected++;
      });

      const onDrop = () => {
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
  application.sse.sendToUser = (login, eventName, data) => {
    const buf = impress.sse.packet(eventName, data);
    const user = application.users[login];
    let key, res;
    if (user && user.sse) {
      for (key in user.sse) {
        res = user.sse[key].res;
        if (!res.finished) res.write(buf);
      }
    }
  };

  // Send event to all users in channel
  //
  application.sse.sendToChannel = (channel, eventName, data) => {
    let login, user, res;
    const buf = impress.sse.packet(eventName, data);
    const logins = application.channels[channel];
    for (let j = 0, jlen = logins.length; j < jlen; j++) {
      login = logins[j];
      user = application.users[login];
      if (user && user.sse) {
        for (let i = 0, ilen = user.sse.length; i < ilen; i++) {
          res = user.sse[i].res;
          if (!res.finished) res.write(buf);
        }
      }
    }
  };

  // Send event to all users in system
  //
  application.sse.sendGlobal = (eventName, data) => {
    const buf = impress.sse.packet(eventName, data);
    const connections = application.sse.connections;
    let connectionId, res;
    for (connectionId in connections) {
      res = connections[connectionId].res;
      if (!res.finished) res.write(buf);
    }
  };

};

// Create SSE packet buffer
//
impress.sse.packet = (eventName, data) => (Buffer.from(
  'event: ' + eventName + '\n' +
  'data: ' + api.json.stringify(data) + '\n\n',
  'utf8'
));
