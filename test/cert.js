'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const metatests = require('metatests');
const { Cert } = require('../lib/cert.js');

const root = process.cwd();

const certPath = path.join(root, 'test/cert/default/');
cp.execSync(certPath + 'generate.sh');

const application = {
  path: path.join(root, 'test'),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
  console: {
    error: () => {},
  },
};

metatests.testAsync('lib/cert', async (test) => {
  let cert = new Cert('cert', application, { ext: ['pem'] });
  await cert.load();
  test.strictSame(cert.files.size, 3);
  test.strictSame(cert.domains.size, 5);
  fs.copyFileSync(certPath + 'self.pem', certPath + 'key.pem');
  cert = new Cert('cert', application, { ext: ['pem'] });
  await cert.load();
  test.strictSame(cert.files.size, 3);
  test.strictSame(cert.domains.size, 0);
  test.end();
});
