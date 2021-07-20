'use strict';

const { node, metarhia } = require('./dependencies.js');
const { fsp, path } = node;
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
  }

  async load() {
    try {
      const files = await fsp.readdir(this.path, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) continue;
        const { name } = file;
        if (!name.endsWith('.json') || name.startsWith('.')) continue;
        const filePath = path.join(this.path, name);
        const data = await fsp.readFile(filePath, 'utf8');
        this.restore(JSON.parse(data));
      }
    } catch (err) {
      this.application.console.error(err.stack);
    }
  }

  restore(record) {
    const { id, name, every, data, run } = record;
    this.stop(id);
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
      data,
      run,
      handler: findHandler(this.application.sandbox, run),
    };
    this.tasks.set(id, task);
    this.start(id);
  }

  async add(record) {
    const id = metautil.nowDate() + '-ID-' + this.nextId.toString();
    this.nextId++;
    const task = { id, ...record };
    this.restore(task);
    const filePath = path.join(this.path, id + '.json');
    try {
      const data = JSON.stringify(task);
      await fsp.writeFile(filePath, data);
    } catch (err) {
      this.application.console.error(err.stack);
    }
    return id;
  }

  start(id) {
    const task = this.tasks.get(id);
    if (!task || task.timer) return;
    const next = task.every.interval;
    if (next === 0) return;
    task.timer = setInterval(async () => {
      if (task.executing) return;
      task.lastStart = Date.now();
      task.executing = true;
      try {
        task.result = await task.handler(task.data);
      } catch (err) {
        task.error = err;
      }
      task.success = !task.error;
      task.lastEnd = Date.now();
      task.executing = false;
      task.runCount++;
    }, next);
  }

  stop(id) {
    const task = this.pause(id);
    if (task) this.tasks.delete(id);
  }

  pause(id) {
    const task = this.tasks.get(id);
    if (!task) return null;
    if (task.timer) {
      clearInterval(task.timer);
      task.timer = null;
    }
    return task;
  }

  stopAll(name = '') {
    for (const task of this.tasks.values()) {
      if (name !== '' && name !== task.name) continue;
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = null;
      }
      this.tasks.delete(task.id);
    }
  }
}

module.exports = { Scheduler };
