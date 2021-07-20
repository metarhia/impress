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
    const { id, name, interval, data, run } = record;
    this.stop(id);
    const task = {
      id,
      name,
      interval: metautil.duration(interval),
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
    task.timer = setInterval(() => {
      if (task.executing) return;
      task.lastStart = Date.now();
      task.executing = true;
      task.handler(task.data, (err, result) => {
        task.success = !err;
        task.error = err;
        task.result = result;
        task.lastEnd = Date.now();
        task.executing = false;
        task.runCount++;
      });
    }, task.interval);
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

  stopAll() {
    for (const task of this.tasks.values()) {
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = null;
      }
      this.tasks.delete(task.id);
    }
  }
}

module.exports = { Scheduler };
