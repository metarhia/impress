'use strict';

const { metarhia } = require('./dependencies.js');

class Scheduler {
  constructor() {
    this.tasks = new Map();
  }

  setTask(taskName, task) {
    this.stopTask(taskName);
    this.tasks.set(taskName, task);
    task.name = taskName;
    task.success = undefined;
    task.error = null;
    task.lastStart = 0;
    task.lastEnd = 0;
    task.executing = false;
    task.active = false;
    task.count = 0;
    this.startTask(taskName);
  }

  // Start Task
  //   taskName <string>
  startTask(taskName) {
    const task = this.tasks.get(taskName);
    if (task && !task.active) {
      task.active = true;
      task.interval = metarhia.common.duration(task.interval);
      task.timer = setInterval(() => {
        if (!task.executing) {
          task.lastStart = Date.now();
          task.executing = true;
          task.run(task, taskResult => {
            task.error = taskResult;
            task.success = taskResult === null;
            task.lastEnd = Date.now();
            task.executing = false;
            task.count++;
          });
        }
      }, task.interval);
    }
  }

  // Stop Task
  //   taskName <string>
  stopTask(taskName) {
    const task = this.tasks.get(taskName);
    if (task) {
      if (task.timer) clearInterval(task.timer);
      this.tasks.delete(taskName);
    }
  }

  stopTasks() {
    for (const task of this.tasks.values()) {
      if (task.timer) clearInterval(task.timer);
      this.tasks.delete(task.name);
    }
  }
}

module.exports = Scheduler;
