'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const dgram = require('node:dgram');
const http = require('node:http');
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const http2 = require('node:http2');
const fsp = require('node:fs').promises;
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const { planThreads } = require('../lib/config.js');

const impress = path.join(__dirname, '..', 'impress.js');
const SHARED = ['scale', 'network', 'lifecycle', 'scheduler', 'sessions'];

const network = {
  nagle: false,
  timeouts: { bind: 2000, request: 5000 },
  queue: { concurrency: 1, size: 1, timeout: 1 },
};

const reservePort = () =>
  new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' ? address.port : 0;
      server.close(() => resolve(port));
    });
  });

const serverSource = (ports) => `({
  api: {
    host: '127.0.0.1',
    ports: ${JSON.stringify(ports)},
    protocols: ['http/1.1'],
  },
});
`;

const writeApp = async (dir, source, options = {}) => {
  const configDir = path.join(dir, 'config');
  await fsp.mkdir(configDir);
  const dependencies = options.dependencies ?? null;
  const pkg = { name: 'fixture', version: '1.0.0' };
  if (dependencies) pkg.dependencies = dependencies;
  const text = `${JSON.stringify(pkg, null, 2)}\n`;
  await fsp.writeFile(path.join(dir, 'package.json'), text);
  const links = options.links ?? null;
  if (links) {
    const modules = path.join(dir, 'node_modules');
    await fsp.mkdir(modules);
    const names = Object.keys(links);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const target = links[name];
      await fsp.symlink(target, path.join(modules, name));
    }
  }
  await fsp.writeFile(path.join(dir, '.applications'), '.\n');
  const from = path.join(__dirname, 'config');
  for (let i = 0; i < SHARED.length; i++) {
    const name = SHARED[i];
    await fsp.copyFile(
      path.join(from, `${name}.js`),
      path.join(configDir, `${name}.js`),
    );
  }
  const log = `({
  keepDays: 1,
  writeInterval: 3000,
  writeBuffer: 65536,
  toStdout: ['error', 'warn', 'info'],
  toFile: [],
});
`;
  const workers = `({
  pool: 0,
  wait: 2000,
  timeout: 5000,
});
`;
  await fsp.writeFile(path.join(configDir, 'log.js'), log);
  await fsp.writeFile(path.join(configDir, 'workers.js'), workers);
  await fsp.writeFile(path.join(configDir, 'server.js'), source);
  const sections = options.sections ?? null;
  if (!sections) return;
  const names = Object.keys(sections);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const file = path.join(configDir, `${name}.js`);
    await fsp.writeFile(file, sections[name]);
  }
};

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');

const plain = (text) => text.replace(ANSI, '');

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const follow = (child) => {
  let output = '';
  let settled = false;
  const onData = (chunk) => {
    output += chunk.toString();
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  const started = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(output));
    }, 20000);
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const watch = () => {
      if (output.includes('App started')) finish(null);
    };
    child.stdout.on('data', watch);
    child.stderr.on('data', watch);
    child.once('exit', (code) => {
      finish(new Error(`exit ${code}\n${output}`));
    });
  });
  return { started, text: () => output };
};

const parseListens = (output) => {
  const lines = plain(output).split('\n');
  const found = [];
  const label = 'Listen port ';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const at = line.indexOf(label);
    if (at < 0) continue;
    const port = Number(line.slice(at + label.length));
    const workerAt = line.indexOf('W');
    const end = line.indexOf(' ', workerAt);
    const worker = workerAt < 0 ? '' : line.slice(workerAt, end);
    found.push({ worker, port });
  }
  return found;
};

const untilListens = async (read, count) => {
  const startedAt = Date.now();
  let found = [];
  while (Date.now() - startedAt < 3000) {
    found = parseListens(read());
    if (found.length >= count) return found;
    await sleep(50);
  }
  return found;
};

const stopChild = (child) =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGINT');
  });

const readResponse = (port, method, host, route) =>
  new Promise((resolve, reject) => {
    const headers = { Host: host, Connection: 'close' };
    const options = {
      hostname: '127.0.0.1',
      port,
      method,
      path: route,
      headers,
      timeout: 3000,
    };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        const status = res.statusCode;
        const location = res.headers.location ?? '';
        resolve({ status, location, body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${port}`));
    });
    req.end();
  });

const locationPort = (location) => {
  const scheme = location.indexOf('://');
  const start = scheme === -1 ? 0 : scheme + 3;
  const slash = location.indexOf('/', start);
  const end = slash === -1 ? location.length : slash;
  const host = location.slice(start, end);
  const colon = host.lastIndexOf(':');
  if (colon === -1) return 0;
  return Number(host.slice(colon + 1));
};

const fetchStatus = (port) =>
  new Promise((resolve, reject) => {
    const options = { hostname: '127.0.0.1', port, timeout: 3000 };
    const req = http.get(options, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${port}`));
    });
  });

const withApp = async (source, check, options = {}) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'impress-groups-'));
  let child = null;
  try {
    await writeApp(dir, source, options);
    const prepare = options.prepare ?? null;
    if (prepare) await prepare(dir);
    child = spawn(process.execPath, [impress], {
      cwd: dir,
      env: { ...process.env, MODE: 'prod' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const log = follow(child);
    await log.started;
    await check(log.text);
  } finally {
    if (child) await stopChild(child);
    await fsp.rm(dir, { recursive: true, force: true });
  }
};

test('server groups - ports entries and balance targets', () => {
  const threads = planThreads(
    {
      edge: {
        ports: [8000],
        protocols: ['http/1.1'],
        balance: 'api',
      },
      api: {
        ports: [8001, [8002, 8003]],
        protocols: ['h2', 'http/1.1'],
        tls: true,
        transports: ['tcp'],
        domains: ['api.example'],
      },
      web: {
        ports: [80],
        protocols: ['http/1.1'],
        redirect: 'https',
        domains: [],
      },
    },
    network,
  );
  assert.strictEqual(threads.length, 4);
  assert.strictEqual(threads[0].group, 'edge');
  assert.strictEqual(threads[0].application, false);
  assert.strictEqual(threads[0].balance, 'api');
  assert.strictEqual(threads[0].target.protocol, 'https');
  assert.deepStrictEqual(threads[0].target.ports, [8001, 8002, 8003]);
  assert.strictEqual(threads[0].runTests, false);
  assert.deepStrictEqual(threads[1].ports, [8001]);
  assert.deepStrictEqual(threads[2].ports, [8002, 8003]);
  assert.deepStrictEqual(threads[1].protocols, ['h2', 'http/1.1']);
  assert.deepStrictEqual(threads[1].transports, ['tcp']);
  assert.strictEqual(threads[1].tls, true);
  assert.strictEqual(threads[1].application, true);
  assert.strictEqual(threads[1].runTests, true);
  assert.strictEqual(threads[2].runTests, false);
  assert.strictEqual(threads[1].host, '0.0.0.0');
  assert.deepStrictEqual(threads[0].domains, []);
  assert.deepStrictEqual(threads[1].domains, ['api.example']);
  assert.deepStrictEqual(threads[2].domains, ['api.example']);
  assert.deepStrictEqual(threads[3].domains, []);
  assert.strictEqual(threads[3].redirect, 'https');
  assert.strictEqual(threads[3].application, false);
  assert.strictEqual(threads[3].cors, null);
});

test('server groups - one ports array is one thread', async () => {
  const first = await reservePort();
  const second = await reservePort();
  const source = serverSource([[first, second]]);
  await withApp(source, async (read) => {
    const found = await untilListens(read, 2);
    assert.strictEqual(found.length, 2, read());
    assert.strictEqual(found[0].worker, found[1].worker);
    const ports = [found[0].port, found[1].port];
    assert.ok(ports.includes(first));
    assert.ok(ports.includes(second));
    const left = await fetchStatus(first);
    const right = await fetchStatus(second);
    assert.strictEqual(typeof left, 'number');
    assert.strictEqual(typeof right, 'number');
  });
});

test('server groups - two ports entries are two threads', async () => {
  const first = await reservePort();
  const second = await reservePort();
  const source = serverSource([first, second]);
  await withApp(source, async (read) => {
    const found = await untilListens(read, 2);
    assert.strictEqual(found.length, 2, read());
    assert.notStrictEqual(found[0].worker, found[1].worker);
    const left = await fetchStatus(first);
    const right = await fetchStatus(second);
    assert.strictEqual(typeof left, 'number');
    assert.strictEqual(typeof right, 'number');
  });
});

const PROVIDER = path.join(__dirname, 'provider');
const PROVIDER_B = path.join(__dirname, 'provider-b');

const PROVIDER_SECTION = `({
  token: 'seen',
});
`;

const linkProvider = () => ({
  dependencies: { 'fixture-provider': '1.0.0' },
  links: { 'fixture-provider': PROVIDER },
});

const linkBoth = () => ({
  dependencies: {
    'fixture-provider': '1.0.0',
    'fixture-provider-b': '1.0.0',
  },
  links: {
    'fixture-provider': PROVIDER,
    'fixture-provider-b': PROVIDER_B,
  },
});

const groupSource = (ports, protocols) => `({
  rtc: {
    host: '127.0.0.1',
    ports: ${JSON.stringify(ports)},
    transports: ['tcp', 'udp'],
    protocols: ${JSON.stringify(protocols)},
  },
});
`;

const spawnImpress = (dir) =>
  spawn(process.execPath, [impress], {
    cwd: dir,
    env: { ...process.env, MODE: 'prod' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const runToExit = (dir) =>
  new Promise((resolve) => {
    const child = spawnImpress(dir);
    let output = '';
    const onData = (chunk) => {
      output += chunk.toString();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, 20000);
    child.once('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });

const rejectApp = async (source, options, includes) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'impress-groups-'));
  try {
    await writeApp(dir, source, options);
    const result = await runToExit(dir);
    const output = plain(result.output);
    assert.strictEqual(result.code, 1, output);
    assert.ok(!output.includes('App started'), output);
    for (let i = 0; i < includes.length; i++) {
      assert.ok(output.includes(includes[i]), output);
    }
    const marks = ['provider-executed', 'provider-b-executed'];
    for (let i = 0; i < marks.length; i++) {
      const file = path.join(dir, marks[i]);
      await assert.rejects(fsp.access(file));
    }
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
};

const stunPacket = () => {
  const packet = Buffer.alloc(20);
  packet.writeUInt16BE(0x0001, 0);
  packet.writeUInt32BE(0x2112a442, 4);
  packet.write('0123456789ab', 8);
  return packet;
};

const crashPacket = () => {
  const packet = Buffer.alloc(20);
  packet.writeUInt16BE(0x0001, 0);
  packet.writeUInt32BE(0x2112a442, 4);
  packet.write('crashonce!!!', 8);
  return packet;
};

const pushTcp = (port, packet) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve();
    };
    socket.setTimeout(1000, finish);
    socket.on('error', finish);
    socket.on('connect', () => {
      socket.write(packet, () => {
        setTimeout(finish, 200);
      });
    });
  });

const sendTcp = (port, packet) =>
  new Promise((resolve, reject) => {
    const socket = net.connect({ host: '127.0.0.1', port }, () => {
      socket.write(packet);
      resolve(socket);
    });
    socket.once('error', reject);
  });

const sendUdp = (port, packet) =>
  new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    socket.send(packet, port, '127.0.0.1', (error) => {
      socket.close();
      if (error) reject(error);
      else resolve();
    });
  });

const readState = async (dir, index) => {
  const name = `provider-record-${index}.json`;
  const text = await fsp.readFile(path.join(dir, name), 'utf8');
  return JSON.parse(text);
};

const waitState = async (dir, index) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 3000) {
    try {
      const state = await readState(dir, index);
      if (state.tcp !== '' && state.udp !== '') return state;
    } catch {
      // ignore
    }
    await sleep(50);
  }
  return readState(dir, index);
};

test('server groups - provider index follows thread order', () => {
  const providers = [{ name: 'fixture-provider', protocols: ['stun.turn'] }];
  const threads = planThreads(
    {
      edge: {
        ports: [8000],
        protocols: ['http/1.1'],
        balance: 'api',
      },
      api: {
        ports: [8001],
        protocols: ['http/1.1', 'stun.turn'],
      },
      rtc: {
        ports: [3478, 3479],
        protocols: ['stun.turn'],
        transports: ['udp', 'tcp'],
      },
    },
    network,
    providers,
  );
  assert.strictEqual(threads.length, 4);
  assert.deepStrictEqual(threads[0].providers, []);
  assert.strictEqual(threads[1].providers[0].index, 0);
  assert.strictEqual(threads[1].providers[0].count, 3);
  assert.deepStrictEqual(threads[1].providers[0].protocols, ['stun.turn']);
  assert.strictEqual(threads[2].providers[0].index, 1);
  assert.strictEqual(threads[3].providers[0].index, 2);
  assert.strictEqual(threads[3].providers[0].count, 3);
  assert.strictEqual(threads[3].providers[0].name, 'fixture-provider');
});

test('server groups - missing provider is rejected', async () => {
  const port = await reservePort();
  const source = groupSource([port], ['stun.nat-discovery']);
  const expected = 'No provider for protocol "stun.nat-discovery"';
  const includes = [expected, 'group "rtc"', 'application/config/server.js'];
  await rejectApp(source, linkProvider(), includes);
});

test('server groups - unknown protocol is rejected', async () => {
  const port = await reservePort();
  const source = groupSource([port], ['carrier.pigeon']);
  const includes = [
    'Unknown protocol "carrier.pigeon"',
    'group "rtc"',
    'application/config/server.js',
  ];
  await rejectApp(source, linkProvider(), includes);
});

test('server groups - two providers for one id are rejected', async () => {
  const port = await reservePort();
  const source = groupSource([port], ['stun.turn']);
  const text = 'Protocol "stun.turn" is provided by ';
  const who = '"fixture-provider" and "fixture-provider-b" in package.json';
  await rejectApp(source, linkBoth(), [`${text}${who}`]);
});

test('server groups - provider receives tcp and udp', async () => {
  const first = await reservePort();
  const second = await reservePort();
  const source = groupSource([first, second], ['stun.turn']);
  const options = linkProvider();
  options.sections = { 'fixture-provider': PROVIDER_SECTION };
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'impress-groups-'));
  let child = null;
  const sockets = [];
  try {
    await writeApp(dir, source, options);
    child = spawnImpress(dir);
    const log = follow(child);
    await log.started;
    const packet = stunPacket();
    const expected = packet.toString('hex');
    sockets.push(await sendTcp(first, packet));
    sockets.push(await sendTcp(second, packet));
    await sendUdp(first, packet);
    await sendUdp(second, packet);
    const left = await waitState(dir, 0);
    const right = await waitState(dir, 1);
    assert.strictEqual(left.index, 0, JSON.stringify(left));
    assert.strictEqual(right.index, 1, JSON.stringify(right));
    assert.strictEqual(left.count, 2);
    assert.strictEqual(right.count, 2);
    assert.strictEqual(left.tcp, expected);
    assert.strictEqual(right.tcp, expected);
    assert.strictEqual(left.udp, expected);
    assert.strictEqual(right.udp, expected);
    assert.strictEqual(left.token, 'seen');
    assert.strictEqual(left.group, 'rtc');
    assert.deepStrictEqual(left.protocols, ['stun.turn']);
    for (let i = 0; i < sockets.length; i++) sockets[i].destroy();
    await stopChild(child);
    child = null;
    const stopped = await readState(dir, 0);
    const other = await readState(dir, 1);
    assert.strictEqual(stopped.stopped, true);
    assert.strictEqual(other.stopped, true);
    const places = ['api', 'domain', 'lib', 'db', 'bus'];
    for (let i = 0; i < places.length; i++) {
      await assert.rejects(fsp.access(path.join(dir, places[i])));
    }
  } finally {
    for (let i = 0; i < sockets.length; i++) sockets[i].destroy();
    if (child) await stopChild(child);
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

const FIXTURES = path.join(
  __dirname,
  '..',
  '..',
  'metaice',
  'test',
  'fixtures',
);

const domainSource = (ports) => `({
  exact: {
    host: '127.0.0.1',
    ports: [${ports.exact}],
    protocols: ['http/1.1'],
    domains: ['localhost'],
  },
  wild: {
    host: '127.0.0.1',
    ports: [${ports.wild}],
    protocols: ['http/1.1'],
    domains: ['*.example.com'],
  },
  rooted: {
    host: '127.0.0.1',
    ports: [${ports.rooted}],
    protocols: ['http/1.1'],
    domains: ['.example.com'],
  },
  open: {
    host: '127.0.0.1',
    ports: [${ports.open}],
    protocols: ['http/1.1'],
  },
  secure: {
    host: '127.0.0.1',
    ports: [${ports.secure}],
    protocols: ['http/1.1'],
    tls: true,
    domains: [
      'localhost',
      '*.example.com',
      'api.example.com',
      '.example.com',
    ],
  },
});
`;

const copyLocalCert = async (dir) => {
  const target = path.join(dir, 'cert', 'localhost');
  await fsp.mkdir(target, { recursive: true });
  const keyFrom = path.join(FIXTURES, 'turn-key.pem');
  const certFrom = path.join(FIXTURES, 'turn-cert.pem');
  await fsp.copyFile(keyFrom, path.join(target, 'key.pem'));
  await fsp.copyFile(certFrom, path.join(target, 'cert.pem'));
};

const writeNamedCert = async (dir, folder, name) => {
  const target = path.join(dir, 'cert', folder);
  await fsp.mkdir(target, { recursive: true });
  const keyout = path.join(target, 'key.pem');
  const out = path.join(target, 'cert.pem');
  const subject = `/CN=${name}`;
  const alt = `subjectAltName=DNS:${name}`;
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-keyout',
      keyout,
      '-out',
      out,
      '-days',
      '1',
      '-nodes',
      '-subj',
      subject,
      '-addext',
      alt,
    ],
    { stdio: 'ignore' },
  );
};

const httpExchange = (port, host) =>
  new Promise((resolve, reject) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const onError = (error) => reject(error);
    socket.once('error', onError);
    socket.once('connect', () => {
      socket.off('error', onError);
      socket.on('error', () => {});
      const lines = [
        'GET /hello.txt HTTP/1.1',
        `Host: ${host}`,
        'Connection: close',
        '',
        '',
      ];
      socket.end(lines.join('\r\n'));
    });
    const chunks = [];
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.on('close', () => resolve(Buffer.concat(chunks).toString()));
  });

const served = (text) =>
  text.startsWith('HTTP/1.1 200') && text.includes('hello');

const refused = (text) => text.startsWith('HTTP/1.1 421');

const isUnrecognized = (error) => {
  const code = error.code ?? '';
  const reason = error.reason ?? '';
  const message = error.message ?? '';
  const text = `${code} ${reason} ${message}`.toLowerCase();
  const normalized = text.replaceAll(' ', '_');
  return normalized.includes('unrecognized_name');
};

const peerCN = (port, servername) =>
  new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    const socket = tls.connect({
      host: '127.0.0.1',
      port,
      servername,
      rejectUnauthorized: false,
      ALPNProtocols: ['http/1.1'],
    });
    const settle = (error, name) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(name);
    };
    timer = setTimeout(() => {
      settle(new Error(`timeout ${servername}`), '');
    }, 3000);
    socket.once('secureConnect', () => {
      const peer = socket.getPeerCertificate();
      const subject = peer.subject ?? null;
      let name = '';
      if (subject) name = subject.CN ?? '';
      settle(null, name);
    });
    socket.once('error', (error) => {
      settle(error, '');
    });
  });

const expectUnrecognized = async (port, servername) => {
  let error = null;
  try {
    await peerCN(port, servername);
  } catch (failure) {
    error = failure;
  }
  assert.ok(error, servername);
  assert.strictEqual(isUnrecognized(error), true, `${servername} ${error}`);
};

const balanceSource = (ports) => `({
  edge: {
    host: '127.0.0.1',
    ports: [${ports.edge}],
    protocols: ['http/1.1'],
    balance: 'api',
  },
  api: {
    host: '127.0.0.1',
    ports: [${ports.left}, ${ports.right}],
    protocols: ['http/1.1'],
    tls: true,
  },
});
`;

const redirectSource = (port) => `({
  web: {
    host: '127.0.0.1',
    ports: [${port}],
    protocols: ['http/1.1'],
    redirect: 'https',
  },
});
`;

test('server groups - balance chooses a port of the named group', async () => {
  const edge = await reservePort();
  const left = await reservePort();
  const right = await reservePort();
  const source = balanceSource({ edge, left, right });
  await withApp(source, async () => {
    const posted = await readResponse(edge, 'POST', '127.0.0.1', '/picked');
    assert.strictEqual(posted.status, 307, posted.location);
    for (let i = 0; i < 4; i++) {
      const result = await readResponse(edge, 'GET', '127.0.0.1', '/picked');
      assert.strictEqual(result.status, 302, result.location);
      const prefix = 'https://127.0.0.1:';
      assert.ok(result.location.startsWith(prefix), result.location);
      const chosen = locationPort(result.location);
      const inGroup = chosen === left || chosen === right;
      assert.strictEqual(inGroup, true, result.location);
      assert.ok(result.location.endsWith('/picked'), result.location);
    }
  });
});

test('server groups - https redirect answers 301', async () => {
  const port = await reservePort();
  await withApp(redirectSource(port), async () => {
    const posted = await readResponse(port, 'POST', 'xxii.chat:444', '/room');
    assert.strictEqual(posted.status, 301, posted.location);
    assert.strictEqual(posted.location, 'https://xxii.chat:444/room');
    assert.strictEqual(posted.body, '');
    const got = await readResponse(port, 'GET', 'xxii.chat', '/room?x=1');
    assert.strictEqual(got.status, 301, got.location);
    assert.strictEqual(got.location, 'https://xxii.chat/room?x=1');
    assert.strictEqual(got.body, '');
  });
});

const revived = (state, before) => state.started !== before.started;

const waitRevived = async (dir, before) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    try {
      const state = await readState(dir, 0);
      if (revived(state, before)) return state;
    } catch {
      // ignore
    }
    await sleep(50);
  }
  return readState(dir, 0);
};

test('server groups - provider thread restarts after a crash', async () => {
  const port = await reservePort();
  const source = groupSource([port], ['stun.turn']);
  const options = linkProvider();
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'impress-groups-'));
  let child = null;
  try {
    await writeApp(dir, source, options);
    child = spawnImpress(dir);
    const log = follow(child);
    await log.started;
    const before = await readState(dir, 0);
    await pushTcp(port, crashPacket());
    const next = await waitRevived(dir, before);
    const detail = `${JSON.stringify(before)} ${JSON.stringify(next)}`;
    assert.notStrictEqual(next.started, before.started, detail);
    assert.strictEqual(child.exitCode, null);
    const packet = stunPacket();
    const expected = packet.toString('hex');
    const startedAt = Date.now();
    let served = null;
    while (Date.now() - startedAt < 8000) {
      await pushTcp(port, packet);
      try {
        const state = await readState(dir, 0);
        if (state.started === next.started && state.tcp === expected) {
          served = state;
          break;
        }
      } catch {
        // ignore
      }
      await sleep(50);
    }
    assert.ok(served, JSON.stringify(await readState(dir, 0)));
    assert.strictEqual(served.tcp, expected);
    assert.strictEqual(child.exitCode, null);
  } finally {
    if (child) await stopChild(child);
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('server groups - domains and wildcard certificates', async () => {
  const exact = await reservePort();
  const wild = await reservePort();
  const rooted = await reservePort();
  const open = await reservePort();
  const secure = await reservePort();
  const ports = { exact, wild, rooted, open, secure };
  const prepare = async (dir) => {
    await copyLocalCert(dir);
    await writeNamedCert(dir, 'wild', '*.example.com');
    await writeNamedCert(dir, 'api', 'api.example.com');
    const staticDir = path.join(dir, 'static');
    await fsp.mkdir(staticDir);
    await fsp.writeFile(path.join(staticDir, 'hello.txt'), 'hello\n');
  };
  await withApp(
    domainSource(ports),
    async () => {
      const local = await httpExchange(exact, 'localhost');
      assert.ok(served(local), local);
      const folded = await httpExchange(exact, 'LocalHost.');
      assert.ok(served(folded), folded);
      const miss = await httpExchange(exact, 'api.localhost');
      assert.ok(refused(miss), miss);
      assert.ok(!miss.includes('hello'), miss);
      const sub = await httpExchange(wild, 'api.example.com');
      assert.ok(served(sub), sub);
      const apex = await httpExchange(wild, 'example.com');
      assert.ok(refused(apex), apex);
      const deepWild = await httpExchange(wild, 'a.b.example.com');
      assert.ok(refused(deepWild), deepWild);
      const rootName = await httpExchange(rooted, 'example.com');
      assert.ok(served(rootName), rootName);
      const deep = await httpExchange(rooted, 'a.b.example.com');
      assert.ok(served(deep), deep);
      const beside = await httpExchange(rooted, 'notexample.com');
      assert.ok(refused(beside), beside);
      const anyHost = await httpExchange(open, 'anywhere.test');
      assert.ok(served(anyHost), anyHost);
      const localCert = await peerCN(secure, 'localhost');
      assert.strictEqual(localCert, 'localhost');
      const exactCert = await peerCN(secure, 'api.example.com');
      assert.strictEqual(exactCert, 'api.example.com');
      const wildCert = await peerCN(secure, 'www.example.com');
      assert.strictEqual(wildCert, '*.example.com');
      await expectUnrecognized(secure, 'a.b.example.com');
      await expectUnrecognized(secure, 'other.test');
    },
    { prepare },
  );
});

const tlsGroup = (port) => `({
  api: {
    host: '127.0.0.1',
    ports: [${port}],
    protocols: ['h2', 'http/1.1'],
    tls: true,
    domains: ['localhost'],
  },
});
`;

const ADD = `({
  access: 'public',

  parameters: {
    a: 'number',
    b: 'number',
  },

  method: async ({ a, b }) => {
    const result = a + b;
    return result;
  },

  returns: 'number',
});
`;

const prepareApi = async (dir) => {
  await copyLocalCert(dir);
  const staticDir = path.join(dir, 'static');
  await fsp.mkdir(staticDir);
  const hello = path.join(staticDir, 'hello.txt');
  await fsp.writeFile(hello, 'hello\n');
  const apiDir = path.join(dir, 'api', 'math');
  await fsp.mkdir(apiDir, { recursive: true });
  await fsp.writeFile(path.join(apiDir, 'add.js'), ADD);
};

const readH2 = (port, headers, payload = '') =>
  new Promise((resolve, reject) => {
    const session = http2.connect(`https://127.0.0.1:${port}`, {
      rejectUnauthorized: false,
      servername: 'localhost',
    });
    let settled = false;
    let timer = null;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      session.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    timer = setTimeout(() => {
      finish(new Error(`timeout h2 ${port}`), null);
    }, 3000);
    session.once('error', (error) => {
      finish(error, null);
    });
    const req = session.request(headers);
    const chunks = [];
    let status = 0;
    req.on('response', (head) => {
      status = head[':status'] ?? 0;
    });
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      finish(null, { status, body });
    });
    req.once('error', (error) => {
      finish(error, null);
    });
    if (payload) req.end(payload);
    else req.end();
  });

const WS_TEXT = 0x1;
const WS_CLOSE = 0x8;

const maskText = (text) => {
  const payload = Buffer.from(text);
  const length = payload.length;
  const mask = crypto.randomBytes(4);
  const header = Buffer.alloc(6);
  header[0] = 0x81;
  header[1] = 0x80 | length;
  mask.copy(header, 2);
  const masked = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    masked[i] = payload[i] ^ mask[i % 4];
  }
  return Buffer.concat([header, masked]);
};

const nextFrame = (buffer) => {
  if (buffer.length < 2) return null;
  const opcode = buffer[0] & 0x0f;
  let length = buffer[1] & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  }
  const end = offset + length;
  if (buffer.length < end) return null;
  const payload = buffer.subarray(offset, end);
  return { opcode, end, payload };
};

const parsePacket = (text) => {
  try {
    return { packet: JSON.parse(text), error: null };
  } catch (error) {
    return { packet: null, error };
  }
};

const takeText = (buffer) => {
  let offset = 0;
  while (offset < buffer.length) {
    const frame = nextFrame(buffer.subarray(offset));
    if (!frame) return null;
    offset += frame.end;
    if (frame.opcode === WS_TEXT) return frame.payload.toString();
    if (frame.opcode === WS_CLOSE) return '';
  }
  return null;
};

const wsCall = (port, packet) =>
  new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString('base64');
    const socket = tls.connect({
      host: '127.0.0.1',
      port,
      servername: 'localhost',
      rejectUnauthorized: false,
      ALPNProtocols: ['http/1.1'],
    });
    let settled = false;
    let upgraded = false;
    let pending = Buffer.alloc(0);
    let timer = null;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    timer = setTimeout(() => {
      finish(new Error(`timeout websocket ${port}`), null);
    }, 3000);
    socket.once('secureConnect', () => {
      const lines = [
        'GET / HTTP/1.1',
        'Host: localhost',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ];
      socket.write(lines.join('\r\n'));
    });
    socket.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      if (!upgraded) {
        const splitAt = pending.indexOf('\r\n\r\n');
        if (splitAt < 0) return;
        const header = pending.subarray(0, splitAt).toString();
        pending = pending.subarray(splitAt + 4);
        const switching = header.startsWith('HTTP/1.1 101');
        if (!switching) {
          finish(new Error(header), null);
          return;
        }
        upgraded = true;
        socket.write(maskText(JSON.stringify(packet)));
      }
      const text = takeText(pending);
      if (text === null) return;
      if (!text) {
        finish(new Error('websocket closed'), null);
        return;
      }
      const parsed = parsePacket(text);
      if (parsed.error) {
        finish(parsed.error, null);
        return;
      }
      finish(null, { status: 101, packet: parsed.packet });
    });
    socket.once('error', (error) => {
      finish(error, null);
    });
  });

test('server groups - one tls port serves h2 and websocket', async () => {
  const port = await reservePort();
  const source = tlsGroup(port);
  await withApp(
    source,
    async (read) => {
      const file = await readH2(port, { ':path': '/hello.txt' });
      assert.strictEqual(file.status, 200, file.body);
      assert.strictEqual(file.body, 'hello\n', plain(read()));
      const headers = {
        ':method': 'POST',
        ':path': '/api/math/add',
        'content-type': 'application/json',
      };
      const payload = JSON.stringify({ a: 2, b: 3 });
      const posted = await readH2(port, headers, payload);
      const api = JSON.parse(posted.body);
      assert.strictEqual(api.type, 'callback', posted.body);
      assert.strictEqual(api.result, 5, posted.body);
      const call = {
        type: 'call',
        id: '1',
        method: 'math/add',
        args: { a: 2, b: 3 },
      };
      const ws = await wsCall(port, call);
      assert.strictEqual(ws.status, 101, plain(read()));
      assert.strictEqual(ws.packet.type, 'callback');
      assert.strictEqual(ws.packet.id, '1');
      assert.strictEqual(ws.packet.result, 5);
    },
    { prepare: prepareApi },
  );
});
