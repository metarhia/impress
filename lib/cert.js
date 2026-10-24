'use strict';

const { node, metarhia, wt } = require('./deps.js');
const { Static } = require('./static.js');

const folderOf = (name) => node.path.basename(node.path.dirname(name));

class Cert extends Static {
  constructor(name, application, options = {}) {
    super(name, application, options);
    this.domains = new Map();
  }

  get(key) {
    return this.domains.get(key);
  }

  async before(changes) {
    const folders = new Set();
    for (const [name, event] of changes) {
      folders.add(folderOf(name));
      if (event === 'change') await super.change(name);
      if (event === 'delete') super.delete(name);
    }
    await this.init([...folders]);
  }

  folders() {
    return [...new Set([...this.files.keys()].map(folderOf))];
  }

  async load(targetPath) {
    await super.load(targetPath);
    await this.init();
  }

  async init(folders = this.folders()) {
    for (const folder of folders) {
      const keyFile = this.files.get(`/${folder}/key.pem`);
      const certFile = this.files.get(`/${folder}/cert.pem`);
      if (!keyFile || !certFile) continue;
      const key = keyFile.data;
      const cert = certFile.data;
      const domains = [];
      try {
        const x509 = new node.crypto.X509Certificate(cert);
        domains.push(...metarhia.metautil.getX509names(x509));
        if (wt.threadId === 1) {
          const list = domains.join(', ');
          this.application.console.log(`Load certificate for: ${list}`);
        }
        const options = { key, cert };
        const creds = node.tls.createSecureContext(options);
        const context = { ...options, creds };
        for (const domain of domains) this.domains.set(domain, context);
        const httpServer = this.application.server?.httpServer;
        if (!httpServer?.setSecureContext) continue;
        httpServer.setSecureContext(options);
      } catch (error) {
        for (const domain of domains) this.domains.delete(domain);
        this.application.console.error(error.stack);
      }
    }
  }
}

module.exports = { Cert };
