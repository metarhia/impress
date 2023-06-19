'use strict';

const { node, metarhia, wt } = require('./dependencies.js');

class Planner {
  constructor(path, config, { applications, console }) {
    this.path = path;
    this.config = config;
    this.applications = applications;
    this.console = console;
    this.tasks = new Map();
    this.nextId = 0;
    this.now = metarhia.metautil.nowDate();
    this.topics = new Map();
    return this.init();
  }

  async init() {
    const now = metarhia.metautil.nowDate();
    try {
      const files = await node.fsp.readdir(this.path, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) continue;
        const { name } = file;
        if (!name.endsWith('.json')) continue;
        const base = node.path.basename(name, '.json');
        const [date, id] = metarhia.metautil.split(base, '-id-');
        if (date === now) {
          const nextId = parseInt(id, 10) + 1;
          if (nextId > this.nextId) this.nextId = nextId;
        }
        const filePath = node.path.join(this.path, name);
        const data = await node.fsp.readFile(filePath, 'utf8');
        this.restore(JSON.parse(data));
      }
    } catch (error) {
      this.console.error(error.stack);
    }
    return this;
  }

  restore(data) {
    const { id, app, name, every, args, run } = data;
    const startedTask = this.tasks.get(id);
    if (startedTask) return true;
    const task = {
      id,
      app,
      name,
      every: metarhia.metautil.parseEvery(every),
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
    this.tasks.set(id, task);
    const started = this.start(id);
    return started;
  }

  async add(task) {
    const now = metarhia.metautil.nowDate();
    if (this.now !== now) {
      this.nextId = 0;
      this.now = now;
    }
    const id = now + '-id-' + this.nextId.toString();
    if (this.tasks.has(id)) {
      this.console.error(new Error(`Task ${id} already exists`));
      return '';
    }
    task.id = id;
    const every = metarhia.metautil.parseEvery(task.every);
    const next = metarhia.metautil.nextEvent(every);
    if (next === -1) {
      this.console.error(new Error(`Can't schedule a task ${id} in the past`));
      return '';
    }
    this.restore({ id, ...task });
    this.nextId++;
    const filePath = node.path.join(this.path, id + '.json');
    try {
      const data = JSON.stringify(task);
      await node.fsp.writeFile(filePath, data);
    } catch (error) {
      this.console.error(error.stack);
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
    const filePath = node.path.join(this.path, id + '.json');
    try {
      await node.fsp.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.console.error(error.stack);
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
    const next = metarhia.metautil.nextEvent(task.every);
    if (next === -1) {
      this.remove(id);
      return false;
    }
    if (next === 0) return false;
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
      semaphore = new metarhia.metautil.Semaphore(concurrency, size, timeout);
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
    } catch (error) {
      task.error = error;
      if (error.message === 'Semaphore timeout') {
        this.fail(task, 'Scheduler queue is full');
      } else {
        this.console.error(error.stack);
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
    const { port1: port, port2 } = new wt.MessageChannel();
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
