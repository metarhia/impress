'use strict';

const { node, metarhia, wt } = require('./deps.js');
const { Static } = require('./static.js');

class Cert extends Static {
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
      const dir = node.path.dirname(name);
      const folder = node.path.basename(dir);
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
      const dir = node.path.dirname(name);
      const folder = node.path.basename(dir);
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
      if (!Buffer.isBuffer(key) || !Buffer.isBuffer(cert)) continue;
      const domains = [];
      try {
        const x509 = new node.crypto.X509Certificate(cert);
        domains.push(...metarhia.metautil.getX509names(x509));
        if (wt.threadId === 1) {
          const list = domains.join(', ');
          this.application.console.log(`Load certificate for: ${list}`);
        }
        const creds = node.tls.createSecureContext({ key, cert });
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

module.exports = { Cert };
