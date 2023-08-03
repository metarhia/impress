'use strict';

const { wt } = require('./deps.js');

const add = async (task) => {
  const { port1, port2 } = new wt.MessageChannel();
  return new Promise((resolve) => {
    port2.on('message', ({ id }) => {
      port2.close();
      resolve(id);
    });
    const msg = { name: 'task', action: 'add', port: port1, task };
    wt.parentPort.postMessage(msg, [port1]);
  });
};

const remove = async (id) => {
  wt.parentPort.postMessage({ name: 'task', action: 'remove', task: { id } });
};

const stop = (name = '') => {
  wt.parentPort.postMessage({ name: 'task', action: 'stop', task: { name } });
};

module.exports = { add, remove, stop };
