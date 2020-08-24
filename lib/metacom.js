'use strict';

const { node, npm } = require('./dependencies.js');
const { http, https, worker } = node;
const { common, ws } = npm;

const Semaphore = require('./semaphore.js');

const SHUTDOWN_TIMEOUT = 5000;
const LONG_RESPONSE = 30000;

const timeout = msec => new Promise(resolve => {
  setTimeout(resolve, msec);
});

const sample = arr => arr[Math.floor(Math.random() * arr.length)];

const receiveBody = async req => {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  return Buffer.concat(buffers).toString();
};

class Server {
  constructor(config, { application, Client }) {
    this.config = config;
    this.application = application;
    this.Client = Client;
    this.clients = new Map();
    const { ports, host, concurrency, queue } = config;
    this.semaphore = new Semaphore(concurrency, queue.size, queue.timeout);
    const { threadId } = worker;
    const port = ports[threadId - 1];
    this.ports = config.ports.slice(1);
    const transport = threadId === 1 ? http : https;
    const listener = this.listener.bind(this);
    this.server = transport.createServer({ ...application.cert }, listener);
    this.ws = new ws.Server({ server: this.server });
    this.ws.on('connection', (connection, req) => {
      const client = new Client(req, null, connection, application);
      connection.on('message', data => {
        client.message(data);
      });
    });
    this.server.listen(port, host);
  }

  listener(req, res) {
    const { clients, Client } = this;
    let finished = false;
    const { method, url, connection } = req;
    const client = new Client(req, res, null, this.application);
    clients.set(connection, client);

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      clients.delete(connection);
      client.error(504);
    }, LONG_RESPONSE);

    res.on('close', () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clients.delete(connection);
    });

    if (url === '/api') {
      if (method !== 'POST') {
        client.error(403);
        return;
      }
      receiveBody(req).then(data => {
        client.message(data);
      }, err => {
        client.error(500, err);
      });
    } else {
      if (url === '/' && !req.connection.encrypted) {
        const host = common.parseHost(req.headers.host);
        const port = sample(this.ports);
        client.redirect(`https://${host}:${port}/`);
      }
      client.static();
    }
  }

  closeClients() {
    const { clients } = this;
    for (const [connection, client] of clients.entries()) {
      clients.delete(connection);
      client.error(503);
      connection.destroy();
    }
  }

  async close() {
    this.server.close(err => {
      if (err) this.application.logger.error(err.stack);
    });
    await timeout(SHUTDOWN_TIMEOUT);
    this.closeClients();
  }
}

module.exports = { Server };
