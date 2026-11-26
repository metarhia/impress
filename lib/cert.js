'use strict';

const { node, metarhia, wt } = require('./deps.js');
const { Static } = require('./static.js');

const matchDomain = metarhia.metacom.matchDomain;

const IP_MARK = 'IP Address:';

const folderOf = (name) => node.path.basename(node.path.dirname(name));

const ipNames = (cert) => {
  const san = cert.subjectAltName || '';
  const entries = san.split(', ');
  const names = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.startsWith(IP_MARK)) continue;
    names.push(entry.slice(IP_MARK.length));
  }
  return names;
};

const patternRank = (pattern) => {
  const rule = `${pattern}`.toLowerCase();
  if (rule.startsWith('*.')) return 1;
  if (rule.startsWith('.')) return 2;
  return 0;
};

const selectContext = (domains, servername) => {
  let best = null;
  let bestRank = 3;
  for (const name of domains.keys()) {
    const matched = matchDomain([name], servername);
    if (!matched) continue;
    const rank = patternRank(name);
    if (rank >= bestRank) continue;
    best = domains.get(name);
    bestRank = rank;
    if (bestRank === 0) return best;
  }
  return best;
};

class Cert extends Static {
  constructor(name, application, options = {}) {
    super(name, application, options);
    this.domains = new Map();
  }

  contextFor(servername) {
    return selectContext(this.domains, servername);
  }

  async before(changes) {
    const folders = new Set();
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const name = change[0];
      const event = change[1];
      folders.add(folderOf(name));
      if (event === 'change') await super.change(name);
      if (event === 'delete') super.delete(name);
    }
    await this.init(Array.from(folders));
  }

  folders() {
    const found = new Set();
    for (const key of this.files.keys()) found.add(folderOf(key));
    return Array.from(found);
  }

  async load(targetPath) {
    await super.load(targetPath);
    await this.init();
  }

  async init(folders = this.folders()) {
    const ordered = folders.toSorted();
    for (let i = 0; i < ordered.length; i++) {
      const folder = ordered[i];
      const keyFile = this.files.get(`/${folder}/key.pem`);
      const certFile = this.files.get(`/${folder}/cert.pem`);
      if (!keyFile || !certFile) continue;
      const key = keyFile.data;
      const cert = certFile.data;
      let domains = [];
      try {
        const x509 = new node.crypto.X509Certificate(cert);
        const names = metarhia.metautil.getX509names(x509);
        const ips = ipNames(x509);
        domains = names.concat(ips);
        if (wt.threadId === 1) {
          const list = domains.join(', ');
          this.application.console.log(`Load certificate for: ${list}`);
        }
        const options = { key, cert };
        const creds = node.tls.createSecureContext(options);
        const context = { key, cert, creds };
        for (let j = 0; j < domains.length; j++) {
          this.domains.set(domains[j], context);
        }
        const servers = this.application.servers || [];
        for (let s = 0; s < servers.length; s++) {
          const httpServer = servers[s].httpServer;
          if (!httpServer || !httpServer.setSecureContext) continue;
          httpServer.setSecureContext(options);
        }
      } catch (error) {
        for (let j = 0; j < domains.length; j++) {
          this.domains.delete(domains[j]);
        }
        this.application.console.error(error.stack);
      }
    }
  }
}

module.exports = { Cert };
