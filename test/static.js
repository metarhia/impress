'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { Readable } = require('node:stream');
const { Static } = require('../lib/static.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

// Capture transport.write() calls
const makeTransport = (headers = {}) => {
  const result = {};
  return {
    req: { headers },
    write(data, code, ext, options) {
      result.data = data;
      result.code = code;
      result.ext = ext;
      result.options = options;
    },
    result,
  };
};

// Build a SAB-backed file entry matching the projection shape from cache backends
const makeSABFile = (raw) => {
  const sab = new SharedArrayBuffer(raw.byteLength);
  new Uint8Array(sab).set(raw);
  const data = Buffer.from(sab, 0, raw.byteLength);
  const stat = { size: raw.byteLength, isFile: () => true };
  return { data, stat };
};

// Build a Static with serving initialized; override threshold after if needed
const makeStatic = () => {
  const st = new Static('lib', application);
  st.initServing({});
  return st;
};

// --- Constructor ---

test('lib/static - should create Static correctly', () => {
  const st = new Static('lib', application);
  assert.strictEqual(st.files instanceof Map, true);
  assert.strictEqual(st.files.size, 0);
  assert.strictEqual(st.get('/example/add.js'), undefined);
});

// --- initServing ---

test('lib/static - initServing sets search function and finite streamThreshold', () => {
  const st = makeStatic();
  assert.strictEqual(typeof st.search, 'function');
  assert.ok(Number.isFinite(st.streamThreshold));
  assert.ok(st.streamThreshold > 0);
});

// --- serve: exact-hit, small file (200 + Buffer) ---

test('lib/static serve - exact-hit small file returns buffer and 200', async () => {
  const st = makeStatic();
  const file = makeSABFile(Buffer.from('hello'));
  st.setFiles(new Map([['/f.txt', file]]));
  const t = makeTransport();
  await st.serve('/f.txt', t);
  assert.strictEqual(t.result.code, 200);
  assert.ok(Buffer.isBuffer(t.result.data));
  assert.strictEqual(t.result.ext, 'txt');
  assert.deepStrictEqual(t.result.data, file.data);
});

// --- serve: exact-hit, large file above threshold (200 + Readable) ---

test('lib/static serve - large file above threshold streams as Readable', async () => {
  const st = makeStatic();
  st.streamThreshold = 100;
  const raw = Buffer.alloc(200, 0x41); // 200 bytes > threshold
  const file = makeSABFile(raw);
  st.setFiles(new Map([['/big.bin', file]]));
  const t = makeTransport();
  await st.serve('/big.bin', t);
  assert.strictEqual(t.result.code, 200);
  assert.ok(t.result.data instanceof Readable);
  assert.deepStrictEqual(t.result.options, { size: 200 });
});

test('lib/static serve - streamed response delivers correct bytes', async () => {
  const st = makeStatic();
  st.streamThreshold = 100;
  const raw = Buffer.alloc(200, 0x42);
  const file = makeSABFile(raw);
  st.setFiles(new Map([['/big.bin', file]]));
  const t = makeTransport();
  await st.serve('/big.bin', t);
  const chunks = [];
  for await (const chunk of t.result.data) chunks.push(chunk);
  assert.deepStrictEqual(Buffer.concat(chunks), raw);
});

// --- serve: exact-hit, Range request, small file (206 + subarray) ---

test('lib/static serve - range request on small file returns 206 with subarray', async () => {
  const st = makeStatic();
  const raw = Buffer.from('0123456789');
  const file = makeSABFile(raw);
  st.setFiles(new Map([['/data.bin', file]]));
  const t = makeTransport({ range: 'bytes=2-5' });
  await st.serve('/data.bin', t);
  assert.strictEqual(t.result.code, 206);
  assert.ok(Buffer.isBuffer(t.result.data));
  assert.strictEqual(t.result.data.toString(), '2345');
  assert.deepStrictEqual(t.result.options, { start: 2, end: 5, size: 10 });
});

// --- serve: exact-hit, Range request, large file (206 + Readable) ---

test('lib/static serve - range request on large file returns 206 with Readable', async () => {
  const st = makeStatic();
  st.streamThreshold = 100;
  const raw = Buffer.alloc(200, 0x43);
  const file = makeSABFile(raw);
  st.setFiles(new Map([['/big.bin', file]]));
  const t = makeTransport({ range: 'bytes=0-99' });
  await st.serve('/big.bin', t);
  assert.strictEqual(t.result.code, 206);
  assert.ok(t.result.data instanceof Readable);
  assert.deepStrictEqual(t.result.options, { start: 0, end: 99, size: 200 });
});

// --- serve: invalid range → 416 ---

test('lib/static serve - invalid range (start >= size) returns 416', async () => {
  const st = makeStatic();
  const file = makeSABFile(Buffer.from('hello'));
  st.setFiles(new Map([['/f.txt', file]]));
  const t = makeTransport({ range: 'bytes=10-20' }); // start 10 >= size 5
  await st.serve('/f.txt', t);
  assert.strictEqual(t.result.code, 416);
  assert.ok(Buffer.isBuffer(t.result.data));
});

// --- serve: query string is stripped ---

test('lib/static serve - query string is stripped from path', async () => {
  const st = makeStatic();
  const file = makeSABFile(Buffer.from('body {}'));
  st.setFiles(new Map([['/style.css', file]]));
  const t = makeTransport();
  await st.serve('/style.css?v=42', t);
  assert.strictEqual(t.result.code, 200);
  assert.deepStrictEqual(t.result.data, file.data);
});

// --- serve: zero-byte file ---

test('lib/static serve - zero-byte SAB file is served without error', async () => {
  const st = makeStatic();
  const sab = new SharedArrayBuffer(0);
  const data = Buffer.from(sab, 0, 0);
  const stat = { size: 0, isFile: () => true };
  st.setFiles(new Map([['/empty.txt', { data, stat }]]));
  const t = makeTransport();
  await st.serve('/empty.txt', t);
  assert.strictEqual(t.result.code, 200);
  assert.ok(Buffer.isBuffer(t.result.data));
  assert.strictEqual(t.result.data.byteLength, 0);
});

// --- serve: recursive lookup — directory → index.html ---

test('lib/static serve - directory path resolves to index.html (200, full buffer)', async () => {
  const st = makeStatic();
  const file = makeSABFile(Buffer.from('<html></html>'));
  st.setFiles(new Map([['/dir/index.html', file]]));
  const t = makeTransport();
  await st.serve('/dir/', t);
  assert.strictEqual(t.result.code, 200);
  assert.deepStrictEqual(t.result.data, file.data);
});

test('lib/static serve - index.html via directory lookup ignores Range header', async () => {
  // Verifies the documented intentional omission of Range handling in recursive path
  const st = makeStatic();
  const file = makeSABFile(Buffer.from('<html></html>'));
  st.setFiles(new Map([['/dir/index.html', file]]));
  const t = makeTransport({ range: 'bytes=0-3' });
  await st.serve('/dir/', t);
  // Must be 200, NOT 206 — recursive path skips Range handling by design
  assert.strictEqual(t.result.code, 200);
  assert.deepStrictEqual(t.result.data, file.data);
});

// --- serve: internal files (starting with '.') bypass exact-hit path ---

test('lib/static serve - internal file bypasses exact-hit and ignores Range', async () => {
  const st = makeStatic();
  const file = makeSABFile(Buffer.from('<h1>custom 404</h1>'));
  st.setFiles(new Map([['/dir/.404.html', file]]));
  const t = makeTransport({ range: 'bytes=0-3' });
  await st.serve('/dir/.404.html', t);
  // Internal file goes through lookup, not exact-hit — no Range handling → no 206
  assert.strictEqual(t.result.code, 200);
  assert.ok(Buffer.isBuffer(t.result.data));
});

// --- serve: 404 ---

test('lib/static serve - returns 404 for missing file', async () => {
  const st = makeStatic();
  const t = makeTransport();
  await st.serve('/not-found.txt', t);
  assert.strictEqual(t.result.code, 404);
  assert.ok(Buffer.isBuffer(t.result.data));
});
