'use strict';

const { node, metarhia } = require('./dependencies.js');
const { fsp, path, worker } = node;
const { metautil } = metarhia;

const findHandler = (sandbox, name) => {
  const [key, rest] = metautil.split(name, '.');
  const element = sandbox[key];
  if (element) {
    if (rest === '') return element;
    return findHandler(element, rest);
  }
  return null;
};

class Scheduler {
  constructor(application) {
    this.application = application;
    this.path = application.absolute('tasks');
    this.tasks = new Map();
    this.nextId = 0;
    this.executor = false;
    this.semaphore = null;
  }

  async load() {
    this.executor = true;
    const config = this.application.config.server.scheduler;
    const { concurrency, size, timeout } = config;
    this.semaphore = new metautil.Semaphore(concurrency, size, timeout);

    worker.parentPort.on('message', async (data) => {
      if (data.type !== 'event') return;
      if (data.name === 'task:add') this.add(data.task);
      else if (data.name === 'task:remove') this.remove(data.task.id);
      else if (data.name === 'task:stop') this.stop(data.task.name);
    });

    const now = metautil.nowDate();
    try {
      const files = await fsp.readdir(this.path, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) continue;
        const { name } = file;
        if (!name.endsWith('.json') || name.startsWith('.')) continue;
        const base = path.basename(name, '.json');
        const [date, id] = metautil.split(base, '-id-');
        if (date === now) {
          const nextId = parseInt(id);
          if (nextId > this.nextId) this.nextId = nextId;
        }
        const filePath = path.join(this.path, name);
        const data = await fsp.readFile(filePath, 'utf8');
        this.restore(JSON.parse(data));
      }
    } catch (err) {
      this.application.console.error(err.stack);
    }
  }

  restore(record) {
    const { id, name, every, args, run } = record;
    const task = {
      id,
      name,
      every: metautil.parseEvery(every),
      success: undefined,
      result: null,
      error: null,
      lastStart: 0,
      lastEnd: 0,
      executing: false,
      runCount: 0,
      timer: null,
      args,
      run,
      handler: findHandler(this.application.sandbox, run),
    };
    this.tasks.set(id, task);
    return this.start(id);
  }

  async add(record) {
    if (!this.executor) {
      const msg = { type: 'event', name: 'task:add', task: record };
      worker.parentPort.postMessage(msg);
      return;
    }
    const id = metautil.nowDate() + '-id-' + this.nextId.toString();
    this.nextId++;
    const task = { id, ...record };
    const started = this.restore(task);
    if (!started) return;
    const filePath = path.join(this.path, id + '.json');
    try {
      const data = JSON.stringify(task);
      await fsp.writeFile(filePath, data);
    } catch (err) {
      this.application.console.error(err.stack);
    }
  }

  async remove(id) {
    if (!this.executor) {
      const msg = { type: 'event', name: 'task:remove', task: { id } };
      worker.parentPort.postMessage(msg);
      return;
    }
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.delete(id);
      if (task.timer) {
        clearTimeout(task.timer);
        task.timer = null;
      }
    }
    const filePath = path.join(this.path, id + '.json');
    try {
      await fsp.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.application.console.error(err.stack);
      }
    }
    return id;
  }

  start(id) {
    const task = this.tasks.get(id);
    if (!task || task.timer) return false;
    const next = metautil.nextEvent(task.every);
    if (next === -1) {
      this.remove(id);
      return false;
    }
    if (next === 0) {
      this.execute(task, true);
      return true;
    }
    task.timer = setTimeout(() => {
      this.execute(task);
    }, next);
    return true;
  }

  async execute(task, once = false) {
    if (task.executing) {
      this.fail(task, 'Already started task');
      return;
    }
    task.lastStart = Date.now();
    task.executing = true;
    try {
      await this.semaphore.enter();
      task.result = await task.handler(task.args);
    } catch (err) {
      task.error = err;
      if (err.message === 'Semaphore timeout') {
        this.fail(task, 'Scheduler queue is full');
      } else {
        this.application.console.error(err.stack);
      }
    } finally {
      this.semaphore.leave();
    }
    task.success = !task.error;
    task.lastEnd = Date.now();
    task.executing = false;
    task.runCount++;
    task.timer = null;
    if (!once) this.start(task.id);
  }

  fail(task, reason) {
    const { id, name, run, args } = task;
    const target = `${name} (${id}) ${run}(${JSON.stringify(args)})`;
    const msg = `${reason}, can't execute: ${target}`;
    this.application.console.error(msg);
  }

  stop(name = '') {
    if (!this.executor) {
      const msg = { type: 'event', name: 'task:stop', task: { name } };
      worker.parentPort.postMessage(msg);
      return;
    }
    for (const task of this.tasks.values()) {
      if (name !== '' && name !== task.name) continue;
      this.remove(task.id);
    }
  }
}

module.exports = { Scheduler };
