'use strict';

const { http, https, worker, common } = require('./dependencies.js');

const WebSocket = require('ws');
const Semaphore = require('./semaphore.js');
const Client = require('./client.js');

const SHUTDOWN_TIMEOUT = 5000;
const LONG_RESPONSE = 30000;
const METHOD_OFFSET = '/api/'.length;

const clients = new Map();

const receiveArgs = async req => new Promise(resolve => {
  const body = [];
  req.on('data', chunk => {
    body.push(chunk);
  }).on('end', async () => {
    const data = body.join('');
    const args = JSON.parse(data);
    resolve(args);
  });
});

const closeClients = () => {
  for (const [connection, client] of clients.entries()) {
    clients.delete(connection);
    client.error(503);
    connection.destroy();
  }
};

const listener = application => (req, res) => {
  let finished = false;
  const { method, url, connection } = req;
  const client = new Client(req, res, application);
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

  application.logger.log(`${method}\t${url}`);
  if (url.startsWith('/api/')) {
    if (method !== 'POST') {
      client.error(403, new Error(`Forbidden: ${url}`));
      return;
    }
    receiveArgs(req).then(args => {
      const method = url.substring(METHOD_OFFSET);
      client.rpc(method, args);
    });
  } else {
    if (url === '/' && !req.connection.encrypted) {
      const host = common.parseHost(req.headers.host);
      const port = common.sample(application.server.ports);
      client.redirect(`https://${host}:${port}/`);
    }
    client.static();
  }
};

class Server {
  constructor(config, application) {
    this.config = config;
    this.application = application;
    const { ports, host, concurrency, queue } = config;
    this.semaphore = new Semaphore(concurrency, queue.size, queue.timeout);
    const { threadId } = worker;
    const port = ports[threadId - 1];
    this.ports = config.ports.slice(1);
    const handler = listener(application);
    const transport = threadId === 1 ? http : https;
    this.instance = transport.createServer({ ...application.cert }, handler);
    this.ws = new WebSocket.Server({ server: this.instance });
    this.ws.on('connection', (connection, req) => {
      const client = new Client(req, null, application, connection);
      connection.on('message', message => {
        const { method, args } = JSON.parse(message);
        client.rpc(method, args);
      });
    });
    this.instance.listen(port, host);
  }

  async close() {
    this.instance.close(err => {
      if (err) this.application.logger.error(err.stack);
    });
    await common.timeout(SHUTDOWN_TIMEOUT);
    closeClients();
  }
}

module.exports = Server;
