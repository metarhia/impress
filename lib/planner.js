'use strict';

const fsp = require('node:fs').promises;
const path = require('node:path');
const metautil = require('metautil');
const { Semaphore } = metautil;

const QUEUE_ERRORS = ['Semaphore timeout', 'Semaphore queue is full'];
const LINK_MARGIN_MS = 1000;

class Planner {
  constructor(dir, config, { applications, console }) {
    this.path = dir;
    this.config = config;
    this.applications = applications;
    this.console = console;
    this.tasks = new Map();
    this.nextId = 0;
    this.now = metautil.nowDate();
    this.topics = new Map();
    return this.init();
  }

  async init() {
    await metautil.ensureDirectory(this.path);
    try {
      const files = await fsp.readdir(this.path, { withFileTypes: true });
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.isDirectory()) continue;
        const { name } = file;
        if (!name.endsWith('.json')) continue;
        const base = path.basename(name, '.json');
        const parts = metautil.split(base, '-id-');
        const date = parts[0];
        const id = parts[1];
        if (date === this.now) {
          const nextId = parseInt(id, 10) + 1;
          if (nextId > this.nextId) this.nextId = nextId;
        }
        const data = await fsp.readFile(path.join(this.path, name), 'utf8');
        this.restore(JSON.parse(data));
      }
    } catch (error) {
      this.console.error(error.stack);
    }
    return this;
  }

  restore(data) {
    const { id, app, name, every, args, run } = data;
    if (this.tasks.has(id)) return;
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
    this.tasks.set(id, task);
    this.start(id);
  }

  async add(taskRecord) {
    const now = metautil.nowDate();
    if (this.now !== now) {
      this.nextId = 0;
      this.now = now;
    }
    const id = `${now}-id-${this.nextId}`;
    if (this.tasks.has(id)) {
      this.console.error(new Error(`Task ${id} already exists`));
      return '';
    }
    const task = { ...taskRecord, id };
    const every = metautil.parseEvery(task.every);
    const next = metautil.nextEvent(every);
    if (next === -1) {
      const error = new Error(`Can't schedule a task ${id} in the past`);
      this.console.error(error);
      return '';
    }
    this.restore(task);
    this.nextId++;
    const filePath = path.join(this.path, `${id}.json`);
    try {
      const data = JSON.stringify(task);
      await fsp.writeFile(filePath, data);
    } catch (error) {
      this.console.error(error.stack);
    }
    return id;
  }

  async remove(id) {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.delete(id);
      clearTimeout(task.timer);
    }
    const filePath = path.join(this.path, `${id}.json`);
    try {
      await fsp.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.console.error(error.stack);
      }
    }
  }

  async stop(name = '') {
    const ids = [];
    for (const task of this.tasks.values()) {
      if (name === '' || name === task.name) ids.push(task.id);
    }
    await Promise.all(ids.map((id) => this.remove(id)));
  }

  start(id) {
    const task = this.tasks.get(id);
    if (!task || task.timer) return;
    const next = metautil.nextEvent(task.every);
    if (next === -1) return void this.remove(id);
    if (next === 0) return;
    task.timer = setTimeout(() => {
      const once = task.every.ms === 0;
      this.execute(task, once);
    }, next);
  }

  async enter(name) {
    let semaphore = this.topics.get(name);
    if (!semaphore) {
      semaphore = new Semaphore(this.config);
      this.topics.set(name, semaphore);
    }
    return semaphore.enter();
  }

  leave(name) {
    const semaphore = this.topics.get(name);
    if (!semaphore) return;
    semaphore.leave();
    if (semaphore.empty) {
      this.topics.delete(name);
    }
  }

  async execute(task, once = false) {
    if (task.executing) {
      return void this.fail(task, 'Already started task');
    }
    task.lastStart = Date.now();
    task.executing = true;
    try {
      await this.enter(task.name);
      task.result = await this.invoke(task);
    } catch (error) {
      task.error = error;
      if (QUEUE_ERRORS.includes(error.message)) {
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
    const app = this.applications.get(task.app);
    if (!app) {
      const taskJson = JSON.stringify(task);
      const error = new Error(`No application for task: ${taskJson}`);
      this.console.error(error);
      throw error;
    }
    const worker = await app.pool.next().catch(() => null);
    if (!worker) {
      const error = new Error('No thread available');
      this.console.error(error);
      throw error;
    }
    const link = app.links.get(worker);
    const request = { method: task.run, args: task.args };
    const timeout = app.config.workers.timeout + LINK_MARGIN_MS;
    return link.call('pool', 'run', request, { timeout });
  }

  fail(task, reason) {
    const { id, name, run, args } = task;
    const argsJson = JSON.stringify(args);
    const target = `${name} (${id}) ${run}(${argsJson})`;
    const msg = `${reason}, can't execute: ${target}`;
    this.console.error(msg);
  }
}

module.exports = { Planner };
