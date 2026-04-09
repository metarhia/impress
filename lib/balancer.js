'use strict';

const http = require('node:http');
const { parseHost, sample } = require('metautil');
const { buildHeaders } = require('metacom');

const DEFAULT_LISTEN_RETRY = 3;

class Balancer {
  #console = null;
  #headers = null;
  #options = null;
  httpServer = null;

  constructor(context, options) {
    this.#console = context.console;
    this.#options = options;
    this.#headers = buildHeaders(options.cors);
    this.httpServer = http.createServer();
    this.httpServer.on('request', (req, res) => {
      this.#handleRequest(req, res);
    });
  }

  #handleRequest(req, res) {
    if (req.url !== '/') return;
    if (req.method === 'OPTIONS') {
      res.writeHead(200, this.#headers);
      res.end();
      return;
    }
    const host = parseHost(req.headers.host);
    const { protocol, ports } = this.#options;
    const targetPort = sample(ports);
    const targetPath = req.url;
    const location = `${protocol}://${host}:${targetPort}${targetPath}`;
    if (res.headersSent) return;
    const code = ['GET', 'HEAD'].includes(req.method) ? 302 : 307;
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
        const fatal = error.code !== 'EADDRINUSE' || count === 0;
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
