'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fsp = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const IMPRESS = path.join(ROOT, 'impress.js');
const SHARED = ['scale', 'network', 'lifecycle', 'scheduler', 'sessions'];
const WIN = process.platform === 'win32';

const requestStop = (child, signal) => {
  if (typeof child.send !== 'function') {
    child.kill(signal);
    return;
  }
  const sent = child.send('shutdown', (error) => {
    if (error) child.kill(signal);
  });
  if (!sent) child.kill(signal);
};

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
const RUN_LIMIT_MS = 60000;

const LOG = `({
  keepDays: 1,
  writeInterval: 3000,
  writeBuffer: 65536,
  toStdout: ['error', 'warn', 'info', 'debug'],
  toFile: [],
});
`;

const WORKERS = `({
  pool: 2,
  wait: 2000,
  timeout: 3000,
});
`;

const FIXTURE = `({
  sum: async ({ a, b }) => a + b,

  where: async () => application.worker.id,

  echo: async (value) => value,

  fail: async ({ code }) => {
    throw new DomainError(code);
  },

  slow: async ({ ms }) => {
    await metarhia.metautil.delay(ms);
    return ms;
  },

  tick: async ({ file }) => {
    await node.fs.promises.appendFile(file, '.');
  },
});
`;

const LINKS_TEST = `({
  name: 'thread links',
  run: async () => {
    const { assert } = node;
    const call = (method, args, exclusive = false) =>
      application.invoke({ method, args, exclusive });

    assert.strictEqual(await call('lib.fixture.sum', { a: 2, b: 3 }), 5);
    const where = await call('lib.fixture.where', {});
    assert.notStrictEqual(where, application.worker.id);

    const hasCode = (error) => error.code === 'E_FIXTURE';
    const failing = call('lib.fixture.fail', { code: 'E_FIXTURE' });
    await assert.rejects(failing, hasCode);
    await assert.rejects(call('lib.fixture.missing', {}), /Handler not found/);
    await assert.rejects(call('lib.fixture.slow', { ms: 3500 }));

    const date = new Date(1700000000000);
    const map = new Map([['k', 1]]);
    const set = new Set([2]);
    const bytes = new Uint8Array([1, 2, 3]);
    const deep = { list: [1, { x: 1 }] };
    const value = { date, map, set, none: undefined, bytes, deep };
    const echoed = await call('lib.fixture.echo', value);
    const kind = Object.prototype.toString.call(echoed.date);
    assert.strictEqual(kind, '[object Date]');
    assert.strictEqual(echoed.date.getTime(), date.getTime());
    assert.strictEqual(echoed.map.get('k'), 1);
    assert.strictEqual(echoed.set.has(2), true);
    assert.strictEqual('none' in echoed, true);
    assert.strictEqual(echoed.bytes[2], 3);
    assert.strictEqual(echoed.deep.list[1].x, 1);

    const slow = (ms) => call('lib.fixture.slow', { ms }, true);
    const calls = [slow(2500), slow(2500), slow(2500)];
    const results = await Promise.allSettled(calls);
    const fulfilled = results.filter((item) => item.status === 'fulfilled');
    assert.strictEqual(fulfilled.length, 2);
    const rejected = results.find((item) => item.status === 'rejected');
    assert.match(rejected.reason.message, /No thread available/);
    assert.strictEqual(await slow(10), 10);

    const file = node.path.join(process.cwd(), 'ticks.txt');
    const task = { name: 'fixture-tick', every: '1s' };
    task.run = 'lib.fixture.tick';
    task.args = { file };
    const id = await application.scheduler.add(task);
    assert.match(id, /-id-/);
    let ticked = false;
    for (let i = 0; i < 50 && !ticked; i++) {
      await metarhia.metautil.delay(100);
      try {
        await node.fs.promises.access(file);
        ticked = true;
      } catch {
        // tick file is not written yet
      }
    }
    assert.strictEqual(ticked, true);
    await application.scheduler.stop('fixture-tick');
    await application.scheduler.remove(id);
  },
});
`;

const FAILING_TEST = `({
  name: 'failing on purpose',
  run: async () => {
    node.assert.strictEqual(1, 2);
  },
});
`;

const reservePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const serverSource = (port) => `({
  api: {
    host: '127.0.0.1',
    ports: [${port}],
    protocols: ['http/1.1'],
  },
});
`;

const writeApp = async (lib) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'impress-links-'));
  const configDir = path.join(dir, 'config');
  const libDir = path.join(dir, 'lib');
  await fsp.mkdir(configDir);
  await fsp.mkdir(libDir);
  const pkg = { name: 'fixture', version: '1.0.0' };
  const text = `${JSON.stringify(pkg, null, 2)}\n`;
  await fsp.writeFile(path.join(dir, 'package.json'), text);
  await fsp.writeFile(path.join(dir, '.applications'), '.\n');
  const from = path.join(__dirname, 'config');
  for (let i = 0; i < SHARED.length; i++) {
    const name = `${SHARED[i]}.js`;
    await fsp.copyFile(path.join(from, name), path.join(configDir, name));
  }
  const port = await reservePort();
  await fsp.writeFile(path.join(configDir, 'log.js'), LOG);
  await fsp.writeFile(path.join(configDir, 'workers.js'), WORKERS);
  await fsp.writeFile(path.join(configDir, 'server.js'), serverSource(port));
  const names = Object.keys(lib);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    await fsp.writeFile(path.join(libDir, name), lib[name]);
  }
  return dir;
};

const plain = (text) => text.replace(ANSI, '');

const spawnApp = (dir, mode) => {
  const env = { ...process.env, MODE: mode, NODE_TEST_CONTEXT: undefined };
  const stdio = ['ignore', 'pipe', 'pipe'];
  if (WIN) stdio.push('ipc');
  return spawn(process.execPath, [IMPRESS], { cwd: dir, env, stdio });
};

const collect = (child) => {
  const state = { output: '' };
  const onData = (chunk) => {
    state.output += chunk.toString();
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  return state;
};

const untilExit = (child) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), RUN_LIMIT_MS);
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

const untilOutput = (state, text) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (plain(state.output).includes(text)) return void resolve();
      if (Date.now() - started > RUN_LIMIT_MS) {
        return void reject(new Error(`No "${text}" in output`));
      }
      setTimeout(check, 50);
    };
    check();
  });

const countOf = (text, part) => text.split(part).length - 1;

const runTests = async (lib) => {
  const dir = await writeApp(lib);
  try {
    const child = spawnApp(dir, 'test');
    const state = collect(child);
    const code = await untilExit(child);
    return { code, output: plain(state.output) };
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
};

test('thread links - invoke, errors, types, pool, scheduler', async () => {
  const lib = { 'fixture.js': FIXTURE, 'links.test.js': LINKS_TEST };
  const { code, output } = await runTests(lib);
  assert.ok(output.includes('Passed 1, Failed: 0'), output);
  assert.strictEqual(code, 0, output);
});

test('thread links - failed app tests exit with code 1', async () => {
  const lib = { 'fixture.js': FIXTURE, 'failing.test.js': FAILING_TEST };
  const { code, output } = await runTests(lib);
  assert.ok(output.includes('Passed 0, Failed: 1'), output);
  assert.strictEqual(code, 1, output);
});

test('thread links - SIGTERM stops every thread over its link', async () => {
  const dir = await writeApp({ 'fixture.js': FIXTURE });
  try {
    const child = spawnApp(dir, 'prod');
    const state = collect(child);
    await untilOutput(state, 'App started');
    const exiting = untilExit(child);
    requestStop(child, 'SIGTERM');
    const code = await exiting;
    const output = plain(state.output);
    assert.strictEqual(code, 0, output);
    const started = countOf(output, 'Application started in worker');
    const stopped = countOf(output, 'Graceful shutdown in worker ');
    assert.strictEqual(started, 3, output);
    assert.strictEqual(stopped, started + 1, output);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('thread links - no impress messages on parentPort', async () => {
  const lib = path.join(ROOT, 'lib');
  const names = await fsp.readdir(lib);
  const files = names.map((name) => path.join(lib, name)).concat([IMPRESS]);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.endsWith('.js')) continue;
    const source = await fsp.readFile(file, 'utf8');
    assert.ok(!source.includes('parentPort'), file);
    const messages = countOf(source, `on('message'`);
    const marker = `message === 'shutdown'`;
    const shutdown = file === IMPRESS && source.includes(marker);
    const allowed = shutdown ? 1 : 0;
    assert.strictEqual(messages, allowed, file);
  }
});
