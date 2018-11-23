'use strict';

// Application state synchronization for Impress Application Server

class State extends api.events.EventEmitter {

  constructor() {
    super();
    this.data = {}; // data structures for synchronization
    this.delta = {}; // delta to be synced at next syncronization
    this.back = {}; // data for rollback
    this.timer = null; // timer object or null
    this.timeout = undefined; // next timer event timestamp in milliseconds
    this.mode = 'lazy'; // syncronization mode: lazy, transaction
    this.started = false; // transaction started or not
    this.changed = false; // state changed locally and not synchronized
    this.subscribers = {}; // hash of arrays { path: array of functions }
    this.watchers = {}; // hash of arrays
    this.on('change', (data, isTarget) => {
      if (!isTarget) return;
      const delta = data.delta;
      for (const key in delta) {
        let value;
        const item = delta[key];
        if (item.type === 'inc') {
          value = api.common.getByPath(this.data, key);
          value += item.value;
          api.common.setByPath(this.data, key, value);
        } else if (item.type === 'set') {
          value = item.value;
          api.common.setByPath(this.data, key, value);
        } else if (item.type === 'del') {
          value = undefined;
          api.common.deleteByPath(this.data, key, value);
        }
        this.change(key, value, true);
      }
    });
  }

  removeTimer() {
    if (this.timer) {
      api.timers.clearTimeout(this.timer);
      this.timer = null;
      this.timeout = undefined;
    }
  }

  sendDelta() {
    this.removeTimer();
    if (this.changed) {
      const delta = this.delta;
      this.delta = {};
      this.changed = false;
      this.emit('change', { delta });
    }
  }

  // Sync
  //   delay <number> synchronization deley or immediate (optional)
  sync(delay) {
    if (this.started) return;
    delay = api.common.duration(delay);
    if (delay === 0) {
      this.sendDelta();
      return;
    }
    const timeout = Date.now() + delay;
    if (this.timer && this.timeout > timeout) {
      this.removeTimer();
    }
    if (!this.timer) {
      this.timer = api.timers.setTimeout(() => {
        this.sendDelta();
      }, timeout);
      this.timeout = timeout;
    }
  }

  start() {
    this.sendDelta();
    this.mode = 'transaction';
    this.started = true;
  }

  commit() {
    this.sendDelta();
    this.mode = 'lazy';
    this.started = false;
  }

  rollback() {
    this.removeTimer();
    for (const key in this.back) {
      api.common.setByPath(this.data, key, this.back[key]);
    }
    this.delta = {};
    this.back = {};
    this.mode = 'lazy';
    this.started = false;
    this.changed = false;
  }

  get(path) {
    return api.common.getByPath(this.data, path);
  }

  // Inc state
  //   path <string> field path to incremental value
  //   value <scalar> increment by value, must be number (optional)
  //   delay <number> | <string> milliseconds or duration (optional)
  inc(path, value, delay) {
    if (typeof value !== 'number') value = 1;
    let item = this.delta[path];
    if (item) {
      delete this.delta[path];
      if (item.type === 'inc' || item.type === 'set') {
        item.value += value;
      } else if (item.type === 'del') {
        item.type = 'inc';
        item.value = value;
      }
    } else {
      item = { value, type: 'inc' };
      this.delta[path] = item;
    }
    this.changed = true;
    const data = api.common.getByPath(this.data, path);
    if (typeof data === 'number') value = data + value;
    api.common.setByPath(this.data, path, value);
    this.sync(delay);
    this.change(path, value, false);
  }

  // Dec state
  //   path <string> field path
  //   value <scalar> decrement by value, must be number (optional)
  //   delay <number> | <string> milliseconds or duration (optional)
  dec(path, value, delay) {
    if (typeof value !== 'number') value = 1;
    this.inc(path, -value, delay);
  }

  // Set state
  //   path <string> field path
  //   value <scalar> value to be assigned
  //   delay <number> | <string> milliseconds or duration (optional)
  set(path, value, delay) {
    for (const key in this.delta) {
      if (key.startsWith(path)) {
        delete this.delta[key];
      }
    }
    const item = { value, type: 'set' };
    this.delta[path] = item;
    this.changed = true;
    api.common.setByPath(this.data, path, value);
    this.sync(delay);
    this.change(path, value, false);
  }

  // Delete state
  //   path <string> field path
  //   delay <number> | <string> milliseconds or duration (optional)
  delete(path, delay) {
    for (const key in this.delta) {
      if (key.startsWith(path)) {
        delete this.delta[key];
      }
    }
    const item = { type: 'del' };
    this.delta[path] = item;
    api.common.deleteByPath(this.data, path);
    this.sync(delay);
    this.change(path, undefined, false);
    this.changed = Object.keys(this.delta).length > 0;
    if (!this.changed && this.timer) this.removeTimer();
  }

  // Subscribe for state chenges
  //   path <string> field path
  //   callback <Function>
  subscribe(path, callback) {
    let subscribers = this.subscribers[path];
    if (!subscribers) {
      subscribers = [];
      this.subscribers[path] = subscribers;
    }
    subscribers.push(callback);
  }

  // Watch state
  //   path <string> field path
  //   callback <Function>
  watch(path, callback) {
    let watchers = this.watchers[path];
    if (!watchers) {
      watchers = [];
      this.watchers[path] = watchers;
    }
    watchers.push(callback);
  }

  // Change data
  //   path <string> data path
  //   value <scalar> data value (optional)
  //   remote <boolean> indicate is it remote changes or local
  change(path, value, remote) {
    const subscribers = this.subscribers[path];
    let callback, watchers;
    if (value === undefined) value = this.get(path);

    if (subscribers) {
      for (let i = 0; i < subscribers.length; i++) {
        callback = subscribers[i];
        callback(path, value, remote);
      }
    }
    for (const key in this.watchers) {
      if (path.startsWith(key)) {
        watchers = this.watchers[key];
        for (let j = 0; j < watchers.length; j++) {
          callback = watchers[j];
          callback(path, value, remote);
        }
      }
    }
  }

}

impress.State = State;
