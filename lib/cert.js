'use strict';

const { node, metarhia, wt } = require('./deps.js');
const { Place } = require('./place.js');

const WIN = process.platform === 'win32';
const MAX_FILE_SIZE = '10 mb';

class Cert extends Place {
  constructor(name, application, options = {}) {
    super(name, application);
    this.files = new Map();
    this.domains = new Map();
    this.ext = options.ext;
    this.maxFileSize = -1;
  }

  get(key) {
    return this.domains.get(key);
  }

  getKey(filePath) {
    const key = filePath.substring(this.path.length);
    if (WIN) return metarhia.metautil.replace(key, node.path.sep, '/');
    return key;
  }

  delete(filePath) {
    const key = this.getKey(filePath);
    this.files.delete(key);
  }

  async change(filePath) {
    if (this.maxFileSize === -1) {
      const maxFileSize = this.application.config?.cache?.maxFileSize;
      const size = maxFileSize || MAX_FILE_SIZE;
      this.maxFileSize = metarhia.metautil.sizeToBytes(size);
    }
    const ext = metarhia.metautil.fileExt(filePath);
    if (this.ext && !this.ext.includes(ext)) return;
    try {
      const stat = await node.fsp.stat(filePath);
      const key = this.getKey(filePath);
      if (stat.size > this.maxFileSize) {
        this.files.set(key, { data: null, stat });
      } else {
        const data = await node.fsp.readFile(filePath);
        this.files.set(key, { data, stat });
      }
    } catch {
      this.delete(filePath);
    }
  }

  async before(changes) {
    const folders = new Set();
    for (const [name, event] of changes) {
      const dir = node.path.dirname(name);
      const folder = node.path.basename(dir);
      folders.add(folder);
      if (event === 'change') await this.change(name);
      if (event === 'datele') this.delete(name);
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
        if (!this.application.server?.httpServer.setSecureContext) continue;
        this.application.server.httpServer.setSecureContext(options);
      } catch (error) {
        for (const domain of domains) this.domains.delete(domain);
        this.application.console.error(error.stack);
      }
    }
  }
}

module.exports = { Cert };
