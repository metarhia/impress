'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs').promises;
const { Planner } = require('../lib/planner.js');

const mockConsole = {
  info() {},
  warn() {},
  error() {},
};

const makeConfig = () => ({ concurrency: 5, size: 20, timeout: 1000 });

const makeDir = async () =>
  fsp.mkdtemp(path.join(os.tmpdir(), 'impress-planner-'));

test('lib/planner - should initialize with empty tasks map', async () => {
  const dir = await makeDir();
  const planner = await new Planner(dir, makeConfig(), {
    applications: new Map(),
    console: mockConsole,
  });
  assert.strictEqual(planner.tasks instanceof Map, true);
  assert.strictEqual(planner.tasks.size, 0);
  assert.strictEqual(planner.topics instanceof Map, true);
  await planner.stop();
});

test('lib/planner - should add and remove a task', async () => {
  const dir = await makeDir();
  const planner = await new Planner(dir, makeConfig(), {
    applications: new Map(),
    console: mockConsole,
  });

  const id = await planner.add({
    app: 'test-app',
    name: 'task1',
    every: '1d',
    args: {},
    run: 'lib.task',
  });

  assert.strictEqual(typeof id, 'string');
  assert.ok(id.length > 0);
  assert.strictEqual(planner.tasks.has(id), true);

  await planner.remove(id);
  assert.strictEqual(planner.tasks.has(id), false);
  await planner.stop();
});

test('lib/planner - should stop tasks by name', async () => {
  const dir = await makeDir();
  const planner = await new Planner(dir, makeConfig(), {
    applications: new Map(),
    console: mockConsole,
  });

  const id1 = await planner.add({
    app: 'app1',
    name: 'cleanup',
    every: '1d',
    args: {},
    run: 'lib.cleanup',
  });

  const id2 = await planner.add({
    app: 'app1',
    name: 'cleanup',
    every: '2d',
    args: {},
    run: 'lib.cleanup',
  });

  const id3 = await planner.add({
    app: 'app1',
    name: 'report',
    every: '1d',
    args: {},
    run: 'lib.report',
  });

  assert.strictEqual(planner.tasks.has(id1), true);
  assert.strictEqual(planner.tasks.has(id2), true);
  assert.strictEqual(planner.tasks.has(id3), true);

  await planner.stop('cleanup');

  assert.strictEqual(planner.tasks.has(id1), false);
  assert.strictEqual(planner.tasks.has(id2), false);
  assert.strictEqual(planner.tasks.has(id3), true);

  await planner.stop();
});

test('lib/planner - stop with no name removes all tasks', async () => {
  const dir = await makeDir();
  const planner = await new Planner(dir, makeConfig(), {
    applications: new Map(),
    console: mockConsole,
  });

  const taskA = { app: 'app', name: 'a', every: '1d', args: {}, run: 'lib.a' };
  const taskB = { app: 'app', name: 'b', every: '1d', args: {}, run: 'lib.b' };
  await planner.add(taskA);
  await planner.add(taskB);

  assert.ok(planner.tasks.size >= 2);
  await planner.stop();
  assert.strictEqual(planner.tasks.size, 0);
});

test('lib/planner - should restore tasks from persisted files', async () => {
  const dir = await makeDir();
  const config = makeConfig();
  const opts = { applications: new Map(), console: mockConsole };

  const planner1 = await new Planner(dir, config, opts);
  const id = await planner1.add({
    app: 'app',
    name: 'persisted',
    every: '1d',
    args: { key: 'val' },
    run: 'lib.job',
  });
  assert.ok(id.length > 0);
  // Clear timers without deleting files so planner2 can restore them
  for (const task of planner1.tasks.values()) {
    if (task.timer) {
      clearTimeout(task.timer);
      task.timer = null;
    }
  }

  const planner2 = await new Planner(dir, config, opts);
  assert.strictEqual(planner2.tasks.has(id), true);
  const task = planner2.tasks.get(id);
  assert.strictEqual(task.name, 'persisted');
  assert.deepStrictEqual(task.args, { key: 'val' });
  await planner2.stop();
});

test('lib/planner - remove non-existent id should not throw', async () => {
  const dir = await makeDir();
  const planner = await new Planner(dir, makeConfig(), {
    applications: new Map(),
    console: mockConsole,
  });
  await assert.doesNotReject(() => planner.remove('nonexistent-id'));
  await planner.stop();
});
