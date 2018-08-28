'use strict';

// Server-Sent Events plugin for Impress Application Server

const SSE_PADDING = ':' + new Array(2049).join(' ') + '\n\n';
const SSE_CONNECTED = Buffer.from(SSE_PADDING, 'utf8');
const SSE_SET_RETRY = Buffer.from('retry: 2000\n\n', 'utf8');
const SSE_HEARTBEAT = Buffer.from(':\n\n', 'utf8');
const SSE_HB_INTERVAL = 10000;

const packet = (
  // Create SSE packet buffer
  eventName, // event name
  data // attached data
) => Buffer.from(
  'event: ' + eventName + '\n' +
  'data: ' + api.json.stringify(data) + '\n\n',
  'utf8'
);

const mixin = (application) => {

  const sse = application.sse;

  sse.nextConnectionId = 1; // counter, connection identifier
  sse.connections = new Map(); // all SSE connections
  sse.statistics = {
    incoming: 0, // incoming connection count from server start
    active: 0, // active connection count
    disconnected: 0, // disconnected connection count from server start
    errors: 0 // connection error count from server start
  };

  sse.heartbeat = api.timers.setInterval(() => {
    const connections = sse.connections;
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

    const connectionId = sse.nextConnectionId++;
    this.sseConnectionId = connectionId;

    const user = this.user;
    if (user) user.sse[connectionId] = this;
    sse.connections.set(connectionId, this);

    let channel = application.channels[this.eventChannel];
    if (!channel) {
      channel = [];
      application.channels[this.eventChannel] = channel;
    }
    if (user && !channel.includes(user.login)) {
      channel.push(user.login);
    }

    sse.statistics.incoming++;
    sse.statistics.active++;

    this.req.on('close', () => {
      application.emit('clientDisconnect', this);
      sse.connections.delete(connectionId);
      sse.statistics.active--;
      sse.statistics.disconnected++;
    });

    const onDrop = () => {
      application.emit('clientDisconnect', this);
      sse.statistics.active--;
      sse.statistics.disconnected++;
      sse.statistics.errors++;
    };

    this.req.on('error', onDrop);
    this.req.on('timeout', onDrop);
    this.socket.on('timeout', onDrop);
  };

  sse.sendToUser = (
    login, // send event to all connections of this user
    eventName, // event name
    data // attached data
  ) => {
    const buf = packet(eventName, data);
    const user = application.users.get(login);
    if (user && user.sse) {
      for (const key in user.sse) {
        const res = user.sse[key].res;
        if (!res.finished) res.write(buf);
      }
    }
  };

  sse.sendToChannel = (
    // Send event to all users in channel
    channel, // channel name
    eventName, // event name
    data // attached data
  ) => {
    const buf = packet(eventName, data);
    const logins = application.channels[channel];
    for (let j = 0; j < logins.length; j++) {
      const login = logins[j];
      const user = application.users.get(login);
      if (user && user.sse) {
        for (let i = 0; i < user.sse.length; i++) {
          const res = user.sse[i].res;
          if (!res.finished) res.write(buf);
        }
      }
    }
  };

  sse.sendGlobal = (
    // Send event to all users in system
    eventName, // event name
    data // attached data
  ) => {
    const buf = packet(eventName, data);
    const connections = sse.connections;
    connections.forEach((connection) => {
      const res = connection.res;
      if (!res.finished) res.write(buf);
    });
  };

};

module.exports = {
  mixinApplication: mixin
};
