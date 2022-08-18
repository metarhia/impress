'use strict';

const path = require('path');
const fsp = require('fs').promises;
const { MessageChannel } = require('worker_threads');
const metautil = require('metautil');

class Planner {
  constructor(path, config, { applications, console }) {
    this.path = path;
    this.config = config;
    this.applications = applications;
    this.console = console;
    this.tasks = new Map();
    this.nextId = 0;
    this.topics = new Map();
    return this.init();
  }

  async init() {
    const now = metautil.nowDate();
    try {
      const files = await fsp.readdir(this.path, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) continue;
        const { name } = file;
        if (!name.endsWith('.json')) continue;
        const base = path.basename(name, '.json');
        const [date, id] = metautil.split(base, '-id-');
        if (date === now) {
          const nextId = parseInt(id) + 1;
          if (nextId > this.nextId) this.nextId = nextId;
        }
        const filePath = path.join(this.path, name);
        const data = await fsp.readFile(filePath, 'utf8');
        this.restore(JSON.parse(data));
      }
    } catch (err) {
      this.console.error(err.stack);
    }
    return this;
  }

  restore(data) {
    const { id, app, name, every, args, run } = data;
    const task = {
      id,
      app,
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
    const startedTask = this.tasks.get(id);
    if (startedTask) return false;
    this.tasks.set(id, task);
    const started = this.start(id);
    return started;
  }

  async add(task) {
    const id = metautil.nowDate() + '-id-' + this.nextId.toString();
    task.id = id;
    const restored = this.restore({ id, ...task });
    if (!restored) console.info('Task already exists');
    const every = metautil.parseEvery(task.every);
    const next = metautil.nextEvent(every);
    if (next === -1) {
      this.console.error(new Error('Can not schedule a task in the past'));
      return '';
    }
    this.nextId++;
    const filePath = path.join(this.path, id + '.json');
    try {
      const data = JSON.stringify(task);
      await fsp.writeFile(filePath, data);
    } catch (err) {
      this.console.error(err.stack);
    }
    return id;
  }

  async remove(id) {
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
        this.console.error(err.stack);
      }
    }
  }

  stop(name = '') {
    for (const task of this.tasks.values()) {
      if (name !== '' && name !== task.name) continue;
      this.remove(task.id);
    }
  }

  start(id) {
    const task = this.tasks.get(id);
    if (!task || task.timer) return false;
    const next = metautil.nextEvent(task.every);
    if (next === -1) this.remove(id);
    if (next <= 0) return false;
    task.timer = setTimeout(() => {
      const once = task.every.ms === 0;
      this.execute(task, once);
    }, next);
    return true;
  }

  async enter(name) {
    let semaphore = this.topics.get(name);
    if (!semaphore) {
      const { concurrency, size, timeout } = this.config;
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
      task.result = await this.invoke(task);
    } catch (err) {
      task.error = err;
      if (err.message === 'Semaphore timeout') {
        this.fail(task, 'Scheduler queue is full');
      } else {
        this.console.error(err.stack);
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

  async invoke(task) {
    const { port1: port, port2 } = new MessageChannel();
    const data = { method: task.run, args: task.args };
    const msg = { name: 'invoke', data, port };
    return new Promise((resolve, reject) => {
      port2.on('message', ({ error, data }) => {
        if (error) reject(error);
        else resolve(data);
      });
      const app = this.applications.get(task.app);
      if (!app) {
        const data = JSON.stringify(task);
        const error = new Error('No application for task: ' + data);
        this.console.error(error);
        return;
      }
      app.pool.next().then(
        (next) => next.postMessage(msg, [port]),
        () => this.console.error(new Error('No thread available')),
      );
    });
  }

  fail(task, reason) {
    const { id, name, run, args } = task;
    const target = `${name} (${id}) ${run}(${JSON.stringify(args)})`;
    const msg = `${reason}, can't execute: ${target}`;
    this.console.error(msg);
  }
}

module.exports = { Planner };
