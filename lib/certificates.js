'use strict';

const tls = require('node:tls');
const { Resources } = require('./resources.js');

class Certificates extends Resources {
  constructor(place, application, options = {}) {
    super(place, application, options);
    this.domains = new Map();
  }

  get(key) {
    return this.domains.get(key);
  }

  after(changes) {
    if (!changes) return;
    const key = this.files.get('/key.pem');
    const cert = this.files.get('/cert.pem');
    const creds = tls.createSecureContext({ key, cert });
    this.domains.set('*', { key, cert, creds });
    if (!this.application.server?.httpServer.setSecureContext) return;
    this.application.server.httpServer.setSecureContext({ key, cert });
  }
}

module.exports = { Certificates };
