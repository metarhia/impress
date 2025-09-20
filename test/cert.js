'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { Cert } = require('../lib/cert.js');

const WIN = process.platform === 'win32';

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

test('lib/cert - should load certificates correctly', async () => {
  if (WIN) return;

  let cert = new Cert('cert', application, { ext: ['pem'] });
  await cert.load();
  assert.strictEqual(cert.files.size, 3);
  assert.strictEqual(cert.domains.size, 5);

  fs.copyFileSync(certPath + 'self.pem', certPath + 'key.pem');
  cert = new Cert('cert', application, { ext: ['pem'] });
  await cert.load();
  assert.strictEqual(cert.files.size, 3);
  assert.strictEqual(cert.domains.size, 0);
});
