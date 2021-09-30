'use strict';

const path = require('path');
const fsp = require('fs').promises;
const { MessageChannel, parentPort } = require('worker_threads');
const metautil = require('metautil');

class Scheduler {
  constructor(application) {
    this.application = application;
    this.path = application.absolute('tasks');
    this.tasks = new Map();
    this.nextId = 0;
    this.executor = false;
    this.topics = new Map();
  }

  async load() {
    this.executor = true;

    parentPort.on('message', async ({ type, name, data, port }) => {
      if (type !== 'task') return;
      if (name === 'add') port.postMessage({ id: await this.add(data) });
      else if (name === 'remove') this.remove(data.id);
      else if (name === 'stop') this.stop(data.name);
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
    const data = {
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
    };
    this.tasks.set(id, data);
    return this.start(id);
  }

  async add(task) {
    if (!this.executor) {
      const { port1, port2 } = new MessageChannel();
      const msg = { type: 'task', name: 'add', data: task, port: port1 };
      return new Promise((resolve) => {
        port2.on('message', ({ id }) => {
          resolve(id);
        });
        parentPort.postMessage(msg, [port1]);
      });
    }
    const id = metautil.nowDate() + '-id-' + this.nextId.toString();
    task.id = id;
    this.nextId++;
    const started = this.restore({ id, ...task });
    if (!started) return id;
    const filePath = path.join(this.path, id + '.json');
    try {
      const data = JSON.stringify(task);
      await fsp.writeFile(filePath, data);
    } catch (err) {
      this.application.console.error(err.stack);
    }
    return id;
  }

  async remove(id) {
    if (!this.executor) {
      const msg = { type: 'task', name: 'remove', data: { id } };
      parentPort.postMessage(msg);
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
      const once = task.every.interval === 0;
      this.execute(task, once);
    }, next);
    return true;
  }

  async enter(name) {
    let semaphore = this.topics.get(name);
    if (!semaphore) {
      const config = this.application.config.server.scheduler;
      const { concurrency, size, timeout } = config;
      semaphore = new metautil.Semaphore(concurrency, size, timeout);
      this.topics.set(name, semaphore);
    }
    return semaphore.enter();
  }

  leave(name) {
    const semaphore = this.topics.get(name);
    if (!semaphore) return;
    if (semaphore.empty) {
      this.topics.delete(name);
    }
    semaphore.leave();
  }

  async execute(task, once = false) {
    if (task.executing) {
      this.fail(task, 'Already started task');
      return;
    }
    task.lastStart = Date.now();
    task.executing = true;
    try {
      await this.enter(task.name);
      task.result = await this.application.invoke({
        method: task.run,
        args: task.args,
      });
    } catch (err) {
      task.error = err;
      if (err.message === 'Semaphore timeout') {
        this.fail(task, 'Scheduler queue is full');
      } else {
        this.application.console.error(err.stack);
      }
    } finally {
      this.leave(task.name);
    }
    task.success = !task.error;
    task.lastEnd = Date.now();
    task.executing = false;
    task.runCount++;
    task.timer = null;
    if (once) this.remove(task.id);
    else this.start(task.id);
  }

  fail(task, reason) {
    const { id, name, run, args } = task;
    const target = `${name} (${id}) ${run}(${JSON.stringify(args)})`;
    const msg = `${reason}, can't execute: ${target}`;
    this.application.console.error(msg);
  }

  stop(name = '') {
    if (!this.executor) {
      const msg = { type: 'task', name: 'stop', data: { name } };
      parentPort.postMessage(msg);
      return;
    }
    for (const task of this.tasks.values()) {
      if (name !== '' && name !== task.name) continue;
      this.remove(task.id);
    }
  }
}

module.exports = { Scheduler };
