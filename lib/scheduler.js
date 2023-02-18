'use strict';

const { MessageChannel, parentPort } = require('worker_threads');

const add = async (task) => {
  const { port1, port2 } = new MessageChannel();
  return new Promise((resolve) => {
    port2.on('message', ({ id }) => {
      resolve(id);
    });
    const msg = { name: 'task', action: 'add', port: port1, task };
    parentPort.postMessage(msg, [port1]);
  });
};

const remove = async (id) => {
  parentPort.postMessage({ name: 'task', action: 'remove', task: { id } });
};

const stop = (name = '') => {
  parentPort.postMessage({ name: 'task', action: 'stop', task: { name } });
};

module.exports = { add, remove, stop };
