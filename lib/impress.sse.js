'use strict';

// Server-Sent Events plugin for Impress Application Server

const SSE_PADDING = ':' + new Array(2049).join(' ') + '\n\n';
const SSE_CONNECTED = Buffer.from(SSE_PADDING, 'utf8');
const SSE_SET_RETRY = Buffer.from('retry: 2000\n\n', 'utf8');
const SSE_HEARTBEAT = Buffer.from(':\n\n', 'utf8');
const SSE_HB_INTERVAL = 10000;

impress.sse.mixin = (application) => {

  application.sse.nextConnectionId = 1; // counter, connection identifier
  application.sse.connections = new Map(); // all SSE connections
  application.sse.statistics = {
    incoming: 0, // incoming connection count from server start
    active: 0, // active connection count
    disconnected: 0, // disconnected connection count from server start
    errors: 0 // connection error count from server start
  };

  application.sse.heartbeat = api.timers.setInterval(() => {
    const connections = application.sse.connections;
    connections.forEach((connection) => {
      if (connection.heartbeat && !connection.res.finished) {
        connection.res.write(SSE_HEARTBEAT);
      }
    });
  }, SSE_HB_INTERVAL);

  impress.Client.prototype.sseConnect = function(
    // Initialize SSE connection
  ) {
    if (!this.eventChannel || this.res.headersSent) {
      this.error(403);
      return;
    }
    this.accessLog();
    this.res.writeHead(200, {
      'Content-Type': impress.MIME_TYPES.sse,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*'
    });

    this.socket.setNoDelay(true);
    this.socket.setTimeout(0);
    this.res.write(SSE_CONNECTED);
    this.res.write(SSE_SET_RETRY);

    const connectionId = application.sse.nextConnectionId++;
    this.sseConnectionId = connectionId;

    const user = this.user;
    if (user) user.sse[connectionId] = this;
    application.sse.connections.set(connectionId, this);

    let channel = application.channels[this.eventChannel];
    if (!channel) {
      channel = [];
      application.channels[this.eventChannel] = channel;
    }
    if (user && !channel.includes(user.login)) {
      channel.push(user.login);
    }

    application.sse.statistics.incoming++;
    application.sse.statistics.active++;

    this.req.on('close', () => {
      application.emit('clientDisconnect', this);
      application.sse.connections.delete(connectionId);
      application.sse.statistics.active--;
      application.sse.statistics.disconnected++;
    });

    const onDrop = () => {
      application.emit('clientDisconnect', this);
      application.sse.statistics.active--;
      application.sse.statistics.disconnected++;
      application.sse.statistics.errors++;
    };

    this.req.on('error', onDrop);
    this.req.on('timeout', onDrop);
    this.socket.on('timeout', onDrop);
  };

  application.sse.sendToUser = (
    login, // send event to all connections of this user
    eventName, // event name
    data // attached data
  ) => {
    const buf = impress.sse.packet(eventName, data);
    const user = application.users.get(login);
    let key, res;
    if (user && user.sse) {
      for (key in user.sse) {
        res = user.sse[key].res;
        if (!res.finished) res.write(buf);
      }
    }
  };

  application.sse.sendToChannel = (
    // Send event to all users in channel
    channel, // channel name
    eventName, // event name
    data // attached data
  ) => {
    const buf = impress.sse.packet(eventName, data);
    const logins = application.channels[channel];
    let j, jlen, i, ilen, login, user, res;
    for (j = 0, jlen = logins.length; j < jlen; j++) {
      login = logins[j];
      user = application.users.get(login);
      if (user && user.sse) {
        for (i = 0, ilen = user.sse.length; i < ilen; i++) {
          res = user.sse[i].res;
          if (!res.finished) res.write(buf);
        }
      }
    }
  };

  application.sse.sendGlobal = (
    // Send event to all users in system
    eventName, // event name
    data // attached data
  ) => {
    const buf = impress.sse.packet(eventName, data);
    const connections = application.sse.connections;
    connections.forEach((connection) => {
      const res = connection.res;
      if (!res.finished) res.write(buf);
    });
  };

};

impress.sse.packet = (
  // Create SSE packet buffer
  eventName, // event name
  data // attached data
) => (
  Buffer.from(
    'event: ' + eventName + '\n' +
    'data: ' + api.json.stringify(data) + '\n\n',
    'utf8'
  )
);
