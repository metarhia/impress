'use strict';

const { peer } = require('./link.js');

const add = (task) => peer.call('planner', 'add', task);

const remove = (id) => peer.call('planner', 'remove', { id });

const stop = (name = '') => peer.call('planner', 'stop', { name });

module.exports = { add, remove, stop };
