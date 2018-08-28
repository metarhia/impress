'use strict';

// Application state synchronization plugin for Impress Application Server

const mixin = (application) => {

  application.state = new api.events.EventEmitter();

  const state = application.state;

  state.data = {}; // data structures for synchronization
  state.delta = {}; // delta to be synced at next syncronization
  state.back = {}; // data for rollback
  state.timer = null; // timer object or null
  state.timeout = null; // next timer event timestamp in milliseconds
  state.mode = 'lazy'; // syncronization mode: lazy, transaction
  state.started = false; // transaction started or not
  state.changed = false; // state changed locally and not synchronized
  state.subscribers = {}; // hash of arrays { path: array of functions }
  state.watchers = {}; // hash of arrays

  const removeTimer = () => {
    if (state.timer) {
      api.timers.clearTimeout(state.timer);
      state.timer = null;
      state.timeout = null;
    }
  };

  const sendDelta = () => {
    removeTimer();
    if (state.changed) {
      const delta = state.delta;
      state.delta = {};
      state.changed = false;
      state.emit('change', { delta });
    }
  };

  const sync = (
    delay // synchronization deley or immediate (optional)
  ) => {
    if (state.started) return;
    delay = api.common.duration(delay);
    if (delay === 0) {
      sendDelta();
      return;
    }
    const timeout = Date.now() + delay;
    if (state.timer && state.timeout > timeout) {
      removeTimer();
    }
    if (!state.timer) {
      state.timer = api.timers.setTimeout(sendDelta, timeout);
      state.timeout = timeout;
    }
  };

  state.start = () => {
    sendDelta();
    state.mode = 'transaction';
    state.started = true;
  };

  state.commit = () => {
    sendDelta();
    state.mode = 'lazy';
    state.started = false;
  };

  state.rollback = () => {
    removeTimer();
    for (const key in state.back) {
      api.common.setByPath(state.data, key, state.back[key]);
    }
    state.delta = {};
    state.back = {};
    state.mode = 'lazy';
    state.started = false;
    state.changed = false;
  };

  state.get = path => api.common.getByPath(state.data, path);

  state.inc = (
    path, // field path to incremental value
    value, // increment by value, must be number (optional)
    delay // milliseconds or duration string, default immediate (optional)
  ) => {
    if (typeof value !== 'number') value = 1;
    let item = state.delta[path];
    if (item) {
      delete state.delta[path];
      if (item.type === 'inc' || item.type === 'set') {
        item.value += value;
      } else if (item.type === 'del') {
        item.type = 'inc';
        item.value = value;
      }
    } else {
      item = { value, type: 'inc' };
      state.delta[path] = item;
    }
    state.changed = true;
    const data = api.common.getByPath(state.data, path);
    if (typeof data === 'number') value = data + value;
    api.common.setByPath(state.data, path, value);
    sync(delay);
    state.change(path, value, false);
  };

  state.dec = (
    path, // field path
    value, // decrement by value, must be number (optional)
    delay // milliseconds or duration string, default immediate (optional)
  ) => {
    if (typeof value !== 'number') value = 1;
    state.inc(path, -value, delay);
  };

  state.set = (
    path, // field path
    value, // value to be assigned
    delay // milliseconds or duration string, default immediate (optional)
  ) => {
    for (const key in state.delta) {
      if (key.startsWith(path)) {
        delete state.delta[key];
      }
    }
    const item = { value, type: 'set' };
    state.delta[path] = item;
    state.changed = true;
    api.common.setByPath(state.data, path, value);
    sync(delay);
    state.change(path, value, false);
  };

  state.delete = (
    path, // field path to delete
    delay // milliseconds or duration string, default immediate (optional)
  ) => {
    for (const key in state.delta) {
      if (key.startsWith(path)) {
        delete state.delta[key];
      }
    }
    const item = { type: 'del' };
    state.delta[path] = item;
    api.common.deleteByPath(state.data, path);
    sync(delay);
    state.change(path, undefined, false);
    state.changed = Object.keys(state.delta).length > 0;
    if (!state.changed && state.timer) removeTimer();
  };

  state.subscribe = (
    path, // data path
    callback //on change function
  ) => {
    let subscribers = state.subscribers[path];
    if (!subscribers) {
      subscribers = [];
      state.subscribers[path] = subscribers;
    }
    subscribers.push(callback);
  };

  state.watch = (
    path, // data path
    callback // on change function
  ) => {
    let watchers = state.watchers[path];
    if (!watchers) {
      watchers = [];
      state.watchers[path] = watchers;
    }
    watchers.push(callback);
  };

  state.change = (
    path, // data path
    value, // data value (optional)
    remote // boolean, indicate is it remote changes or local
  ) => {
    const subscribers = state.subscribers[path];
    let callback, watchers;
    if (value === undefined) value = state.get(path);

    if (subscribers) {
      for (let i = 0; i < subscribers.length; i++) {
        callback = subscribers[i];
        callback(path, value, remote);
      }
    }
    for (const key in state.watchers) {
      if (path.startsWith(key)) {
        watchers = state.watchers[key];
        for (let j = 0; j < watchers.length; j++) {
          callback = watchers[j];
          callback(path, value, remote);
        }
      }
    }
  };

  state.on('change', (data, isTarget) => {
    if (!isTarget) return;
    const delta = data.delta;
    for (const key in delta) {
      let value;
      const item = delta[key];
      if (item.type === 'inc') {
        value = api.common.getByPath(state.data, key);
        value += item.value;
        api.common.setByPath(state.data, key, value);
      } else if (item.type === 'set') {
        value = item.value;
        api.common.setByPath(state.data, key, value);
      } else if (item.type === 'del') {
        value = undefined;
        api.common.deleteByPath(state.data, key, value);
      }
      state.change(key, value, true);
    }
  });

};

module.exports = {
  mixinApplication: mixin
};
