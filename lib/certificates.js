'use strict';

const tls = require('node:tls');
const path = require('node:path');
const { threadId } = require('node:worker_threads');
const { X509Certificate } = require('node:crypto');
const metautil = require('metautil');
const { Resources } = require('./resources.js');

class Certificates extends Resources {
  constructor(place, application, options = {}) {
    super(place, application, options);
    this.domains = new Map();
  }

  get(key) {
    return this.domains.get(key);
  }

  async before(changes) {
    const folders = new Set();
    for (const [name, event] of changes) {
      const dir = path.dirname(name);
      const folder = path.basename(dir);
      folders.add(folder);
      if (event === 'change') await super.change(name);
      if (event === 'datele') super.delete(name);
    }
    await this.init([...folders]);
    changes.length = 0;
  }

  folders() {
    const folders = new Set();
    const files = [...this.files.keys()];
    for (const name of files) {
      const dir = path.dirname(name);
      const folder = path.basename(dir);
      folders.add(folder);
    }
    return [...folders];
  }

  async load(targetPath) {
    await super.load(targetPath);
    await this.init();
  }

  async init(folders = this.folders()) {
    for (const folder of folders) {
      const key = this.files.get(`/${folder}/key.pem`);
      const cert = this.files.get(`/${folder}/cert.pem`);
      if (!key || !cert) continue;
      const x509 = new X509Certificate(cert);
      const domains = metautil.getX509names(x509);
      if (threadId === 1) {
        const list = domains.join(', ');
        this.application.console.log(`Load certificate for: ${list}`);
      }
      try {
        const creds = tls.createSecureContext({ key, cert });
        const context = { key, cert, creds };
        for (const domain of domains) this.domains.set(domain, context);
        if (!this.application.server?.httpServer.setSecureContext) continue;
        this.application.server.httpServer.setSecureContext({ key, cert });
      } catch (error) {
        for (const domain of domains) this.domains.delete(domain);
        this.application.console.error(error.stack);
      }
    }
  }
}

module.exports = { Certificates };
