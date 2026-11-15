'use strict';

const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert');

const deps = require('../lib/deps.js');
const { node, npm, metarhia } = deps;

test('lib/deps - should have correct dependencies structure', async () => {
  const expectedNamespaces = ['node', 'npm', 'metarhia', 'notLoaded', 'wt'];
  assert.deepStrictEqual(Object.keys(deps), expectedNamespaces);
  assert.strictEqual(typeof node, 'object');
  assert.strictEqual(typeof node.os, 'object');
  assert.strictEqual(typeof npm, 'object');
  assert.strictEqual(npm.ws, undefined);
  assert.strictEqual(typeof npm.jsYaml, 'object');
  assert.strictEqual(typeof metarhia, 'object');
  assert.strictEqual(typeof metarhia.metaschema, 'object');
  assert.strictEqual(deps.notLoaded instanceof Set, true);
});

test('lib/deps - impress packages load when the app has none', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'impress-app-'));
  try {
    await fsp.writeFile(path.join(dir, 'package.json'), '{"name":"app"}');
    const depsPath = path.join(__dirname, '../lib/deps.js');
    const script = [
      `const deps = require(${JSON.stringify(depsPath)});`,
      'const { notLoaded, metarhia } = deps;',
      'const loaded = { notLoaded: notLoaded.size };',
      'loaded.metacom = typeof metarhia.metacom.Server;',
      'loaded.metavm = typeof metarhia.metavm.createContext;',
      'console.log(JSON.stringify(loaded));',
    ].join('\n');
    const options = { cwd: dir, encoding: 'utf8' };
    const output = execFileSync(process.execPath, ['-e', script], options);
    const loaded = JSON.parse(output);
    assert.deepStrictEqual(loaded, {
      notLoaded: 0,
      metacom: 'function',
      metavm: 'function',
    });
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});
