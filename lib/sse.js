'use strict';

// Server-Sent Events for Impress Application Server

const SSE_PADDING = ':' + new Array(2049).join(' ') + '\n\n';
const SSE_CONNECTED = Buffer.from(SSE_PADDING, 'utf8');
const SSE_SET_RETRY = Buffer.from('retry: 2000\n\n', 'utf8');
const SSE_HEARTBEAT = Buffer.from(':\n\n', 'utf8');
const SSE_HB_INTERVAL = 10000;

// Create SSE packet buffer
//   eventName <string>
//   data <Object> attached data
const packet = (eventName, data) => Buffer.from(
  `event: ${eventName}\ndata: ${api.json.stringify(data)}\n\n`,
  'utf8'
);

class ServerSentEvents {

  constructor(application) {
    this.application = application;
    this.nextConnectionId = 1; // counter, connection identifier
    this.connections = new Map(); // all SSE connections
    this.statistics = {
      incoming: 0, // incoming connection count from server start
      active: 0, // active connection count
      disconnected: 0, // disconnected connection count from server start
      errors: 0, // connection error count from server start
    };
    this.heartbeat = setInterval(() => {
      this.connections.forEach(connection => {
        if (connection.heartbeat && !connection.res.finished) {
          connection.res.write(SSE_HEARTBEAT);
        }
      });
    }, SSE_HB_INTERVAL);
  }

  // Initialize SSE connection
  connect(client) {
    if (!client.eventChannel || client.res.headersSent) {
      client.error(403);
      return;
    }
    this.application.accessLog(client);
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

    const connectionId = this.application.sse.nextConnectionId++;
    client.sseConnectionId = connectionId;

    const user = client.user;
    if (user) user.sse[connectionId] = client;
    this.application.sse.connections.set(connectionId, client);

    let channel = this.application.channels[client.eventChannel];
    if (!channel) {
      channel = [];
      this.application.channels[client.eventChannel] = channel;
    }
    if (user && !channel.includes(user.login)) {
      channel.push(user.login);
    }

    this.statistics.incoming++;
    this.statistics.active++;

    client.req.on('close', () => {
      this.application.emit('clientDisconnect', client);
      this.connections.delete(connectionId);
      this.statistics.active--;
      this.statistics.disconnected++;
    });

    const onDrop = () => {
      this.application.emit('clientDisconnect', client);
      this.statistics.active--;
      this.statistics.disconnected++;
      this.statistics.errors++;
    };

    client.req.on('error', onDrop);
    client.req.on('timeout', onDrop);
    client.socket.on('timeout', onDrop);
  }

  // Send SSE event to user
  //   login <string> send event to all connections of this user
  //   eventName <string>
  //   data <Object> attached data
  sendToUser(login, eventName, data) {
    const buf = packet(eventName, data);
    const user = this.application.users.get(login);
    if (user && user.sse) {
      for (const key in user.sse) {
        const res = user.sse[key].res;
        if (!res.finished) res.write(buf);
      }
    }
  }

  // Send event to all users in channel
  //   channel <string> channel name
  //   eventName <string> event name
  //   data <Object> attached data
  sendToChannel(channel, eventName, data) {
    const buf = packet(eventName, data);
    const logins = this.application.channels[channel];
    for (let j = 0; j < logins.length; j++) {
      const login = logins[j];
      const user = this.application.users.get(login);
      if (user && user.sse) {
        for (let i = 0; i < user.sse.length; i++) {
          const res = user.sse[i].res;
          if (!res.finished) res.write(buf);
        }
      }
    }
  }

  // Send event to all users in system
  //   eventName <string> event name
  //   data <Object> attached data
  sendGlobal(eventName, data) {
    const buf = packet(eventName, data);
    this.connections.forEach(connection => {
      const res = connection.res;
      if (!res.finished) res.write(buf);
    });
  }

}

impress.ServerSentEvents = ServerSentEvents;
