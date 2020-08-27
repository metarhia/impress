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
    const { host, balancer, protocol, ports, concurrency, queue } = config;
    this.semaphore = new Semaphore(concurrency, queue.size, queue.timeout);
    const { threadId } = worker;
    this.balancer = balancer && threadId === 1;
    const skipBalancer = balancer ? 1 : 0;
    this.port = this.balancer ? balancer : ports[threadId - skipBalancer - 1];
    const transport = protocol === 'http' || this.balancer ? http : https;
    const listener = this.listener.bind(this);
    this.server = transport.createServer({ ...application.cert }, listener);
    this.ws = new ws.Server({ server: this.server });
    this.ws.on('connection', (connection, req) => {
      const client = new Client(req, null, connection, application);
      connection.on('message', data => {
        client.message(data);
      });
    });
    this.server.listen(this.port, host);
  }

  listener(req, res) {
    const { clients, Client } = this;
    let finished = false;
    const { url, connection } = req;
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

    if (this.balancer) {
      const host = common.parseHost(req.headers.host);
      const port = common.sample(this.config.ports);
      const { protocol } = this.config;
      client.redirect(`${protocol}://${host}:${port}/`);
      return;
    }

    if (url.startsWith('/api')) this.request(client);
    else client.static();
  }

  request(client) {
    const { req } = client;
    if (req.method === 'OPTIONS') {
      client.options();
      return;
    }
    if (req.method !== 'POST') {
      client.error(403);
      return;
    }
    const body = receiveBody(req);
    if (req.url === '/api') {
      body.then(data => {
        client.message(data);
      });
    } else {
      body.then(data => {
        const { pathname, searchParams } = new URL('http://' + req.url);
        const [, interfaceName, methodName] = pathname.split('/');
        const args = data ? JSON.parse(data) : Object.fromEntries(searchParams);
        client.rpc(-1, interfaceName, methodName, args);
      });
    }
    body.catch(err => {
      client.error(500, err);
    });
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
