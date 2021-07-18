'use strict';

const { metautil } = require('./dependencies.js').metarhia;

class Scheduler {
  constructor() {
    this.tasks = new Map();
  }

  setTask(taskName, config) {
    const { interval, data, run } = config;
    this.stopTask(taskName);
    const task = {
      name: taskName,
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
    };
    this.tasks.set(taskName, task);
    this.startTask(taskName);
  }

  startTask(taskName) {
    const task = this.tasks.get(taskName);
    if (!task || task.timer) return;
    task.timer = setInterval(() => {
      if (task.executing) return;
      task.lastStart = Date.now();
      task.executing = true;
      task.run(task.data, (err, result) => {
        task.success = !err;
        task.error = err;
        task.result = result;
        task.lastEnd = Date.now();
        task.executing = false;
        task.runCount++;
      });
    }, task.interval);
  }

  stopTask(taskName) {
    const task = this.pauseTask(taskName);
    if (task) this.tasks.delete(taskName);
  }

  pauseTask(taskName) {
    const task = this.tasks.get(taskName);
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
      this.tasks.delete(task.name);
    }
  }
}

module.exports = Scheduler;
