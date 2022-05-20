'use strict';

const { MessageChannel, parentPort } = require('worker_threads');

class Scheduler {
  constructor(application) {
    this.application = application;
  }

  async add(task) {
    const { port1, port2 } = new MessageChannel();
    return new Promise((resolve) => {
      port2.on('message', ({ id }) => {
        resolve(id);
      });
      const msg = { name: 'task', action: 'add', port: port1, task };
      parentPort.postMessage(msg, [port1]);
    });
  }

  async remove(id) {
    parentPort.postMessage({ name: 'task', action: 'remove', task: { id } });
  }

  stop(name = '') {
    parentPort.postMessage({ name: 'task', action: 'stop', task: { name } });
  }
}

module.exports = { Scheduler };
