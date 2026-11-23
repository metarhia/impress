'use strict';

const http = require('node:http');

const { parseHost, sample } = require('metautil');
const { buildHeaders } = require('metacom');

const DEFAULT_LISTEN_RETRY = 3;
const SAFE_METHODS = ['GET', 'HEAD'];

const redirectHttps = (req, res) => {
  const header = req.headers.host;
  const host = typeof header === 'string' ? header : '';
  const route = typeof req.url === 'string' ? req.url : '/';
  const location = `https://${host}${route}`;
  req.resume();
  res.writeHead(301, { Location: location });
  res.end();
};

class Balancer {
  #console = null;
  #headers = null;
  #options = null;
  httpServer = null;
  onRequest = null;

  constructor(context, options) {
    this.#console = context.console;
    this.#options = options;
    this.#headers = buildHeaders(options.cors);
    this.httpServer = http.createServer();
    this.onRequest = (req, res) => {
      this.#handleRequest(req, res);
    };
    this.httpServer.on('request', this.onRequest);
  }

  #handleRequest(req, res) {
    if (this.#options.redirect === 'https') {
      return void redirectHttps(req, res);
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(200, this.#headers);
      res.end();
      return;
    }
    const host = parseHost(req.headers.host);
    const { protocol, ports } = this.#options;
    const targetPort = sample(ports);
    const location = `${protocol}://${host}:${targetPort}${req.url}`;
    const { method } = req;
    const code = SAFE_METHODS.includes(method) ? 302 : 307;
    res.writeHead(code, { ...this.#headers, Location: location });
    res.end();
  }

  listen() {
    const { host, port, timeouts, retry } = this.#options;

    let count = retry || DEFAULT_LISTEN_RETRY;
    let listen = null;

    return new Promise((resolve, reject) => {
      const onListening = () => {
        this.#console.info(`Listen port ${port}`);
        this.httpServer.on('error', (error) => {
          this.#console.error(error);
        });
        resolve(this);
      };

      const onError = (error) => {
        count--;
        const addressInUse = error.code === 'EADDRINUSE';
        const fatal = !addressInUse || count === 0;
        if (fatal) return void reject(error);
        this.#console.warn(`Address in use: ${host}:${port}, retry...`);
        setTimeout(listen, timeouts.bind);
      };

      listen = () => {
        this.httpServer.once('listening', onListening);
        this.httpServer.once('error', onError);
        this.httpServer.listen(port, host);
      };

      listen();
    });
  }

  async close() {
    if (!this.httpServer.listening) return;
    this.httpServer.off('request', this.onRequest);
    this.httpServer.removeAllListeners();
    await new Promise((resolve) => {
      this.httpServer.close((error) => {
        if (error) this.#console.error(error);
        resolve();
      });
    });
  }
}

module.exports = { Balancer };
