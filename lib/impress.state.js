'use strict';

// Application state synchronization plugin for Impress Application Server
//
impress.state = {};

// Stateful Application plugin definition
//
impress.state.mixinApplication = function(application) {

  var state = new api.events.EventEmitter();
  state.data = {};         // data structures for synchronization
  state.delta = {};        // delta to be synced at next syncronization
  state.back = {};         // data for rollback
  state.timer = null;      // timer object or null
  state.timeout = null;    // next timer event timestamp in milliseconds
  state.mode = 'lazy';     // syncronization mode: lazy, transaction
  state.started = false;   // transaction started or not
  state.changed = false;   // state changed locally and not synchronized
  state.subscribers = {};  // hash of arrays, key is path, value is array of function
  state.watchers = {};     // hash of arrays

  // Remove timer
  //
  function removeTimer() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
      state.timeout = null;
    }
  }

  // Send state delta
  //
  function sendDelta() {
    removeTimer();
    if (state.changed) {
      var delta = state.delta;
      state.delta = {};
      state.changed = false;
      application.state.emit('change', { delta: delta });
    }
  }

  // Sync state
  //   delay - synchronization delar or immediate (optional)
  //
  function sync(delay) {
    if (!state.started) {
      delay = api.impress.duration(delay);
      if (delay === 0) sendDelta();
      else {
        var timeout = Date.now() + delay;
        if (state.timer && state.timeout > timeout) removeTimer();
        if (!state.timer) {
          state.timer = setTimeout(sendDelta, timeout);
          state.timeout = timeout;
        }
      }
    }
  }

  // Access state from application
  //
  application.state = state;

  // Start state transaction
  //
  application.state.start = function() {
    sendDelta();
    state.mode = 'transaction';
    state.started = true;
  };

  // Commit state transaction
  //
  application.state.commit = function() {
    sendDelta();
    state.mode = 'lazy';
    state.started = false;
  };

  // Rollback state transaction
  //
  application.state.rollback = function() {
    removeTimer();
    for (var key in state.back) api.impress.setByPath(state.data, key, state.back[key]);
    state.delta = {};
    state.back = {};
    state.mode = 'lazy';
    state.started = false;
    state.changed = false;
  };

  // Get state value/object by path
  //
  application.state.get = function(path) {
    return api.impress.getByPath(state.data, path);
  };

  // Increment value at path
  //   path - field path to incremental value
  //   value - increment by value, must be number (optional)
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.inc = function(path, value, delay) {
    if (typeof(value) !== 'number') value = 1;
    var item = state.delta[path];
    if (item) {
      delete state.delta[path];
      if (item.type === 'inc' || item.type === 'set') item.value += value;
      else if (item.type === 'del') {
        item.type = 'inc';
        item.value = value;
      }
    } else {
      item = { value: value, type: 'inc' };
      state.delta[path] = item;
    }
    state.changed = true;
    var data = api.impress.getByPath(state.data, path);
    if (typeof(data) === 'number') value = data + value;
    api.impress.setByPath(state.data, path, value);
    sync(delay);
    application.state.change(path, value, false);
  };

  // Decrement value at path
  //   path - field path
  //   value - decrement by value, must be number (optional)
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.dec = function(path, value, delay) {
    if (typeof(value) !== 'number') value = 1;
    state.inc(path, -value, delay);
  };

  // Set state value/object by path
  //   path - field path
  //   value - value to be assigned
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.set = function(path, value, delay) {
    for (var key in state.delta) if (api.impress.startsWith(key, path)) delete state.delta[key];
    var item = { value: value, type: 'set' };
    state.delta[path] = item;
    state.changed = true;
    api.impress.setByPath(state.data, path, value);
    sync(delay);
    application.state.change(path, value, false);
  };

  // Delete state value/object by path
  //   path - field path to delete
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.delete = function(path, delay) {
    for (var key in state.delta) if (api.impress.startsWith(key, path)) delete state.delta[key];
    var item = { type: 'del' };
    state.delta[path] = item;
    api.impress.deleteByPath(state.data, path);
    sync(delay);
    application.state.change(path, undefined, false);
    state.changed = Object.keys(state.delta).length > 0;
    if (!state.changed && state.timer) removeTimer();
  };

  // Subscribe on change exact value
  //   path - data path
  //   callback - on change function
  //
  application.state.subscribe = function(path, callback) {
    var subscribers = state.subscribers[path];
    if (!subscribers) {
      subscribers = [];
      state.subscribers[path] = subscribers;
    }
    subscribers.push(callback);
  };

  // Watch all changes
  //   path - data path
  //   callback - on change function
  //
  application.state.watch = function(path, callback) {
    var watchers = state.watchers[path];
    if (!watchers) {
      watchers = [];
      state.watchers[path] = watchers;
    }
    watchers.push(callback);
  };

  // Call all functions subscribed on path
  //   path - data path
  //   value - data value (optional)
  //   remote - boolean, indicate is it remote changes or local
  //
  application.state.change = function(path, value, remote) {
    var subscribers = state.subscribers[path],
        callback, watchers;
    if (value === undefined) value = application.state.get(path);

    if (subscribers) {
      for (var i = 0, ilen = subscribers.length; i < ilen; i++) {
        callback = subscribers[i];
        callback(path, value, remote);
      }
    }
    for (var key in state.watchers) {
      if (api.impress.startsWith(path, key)) {
        watchers = state.watchers[key];
        for (var j = 0, jlen = watchers.length; j < jlen; j++) {
          callback = watchers[j];
          callback(path, value, remote);
        }
      }
    }
  };

  // Receive state events from other processes
  //
  application.state.on('change', function(data, isTarget) {
    if (isTarget) {
      var delta, item, value;
      delta = data.delta;
      for (var key in delta) {
        item = delta[key];
        if (item.type === 'inc') {
          value = api.impress.getByPath(state.data, key);
          value += item.value;
          api.impress.setByPath(state.data, key, value);
        } else if (item.type === 'set') {
          value = item.value;
          api.impress.setByPath(state.data, key, value);
        } else if (item.type === 'del') {
          value = undefined;
          api.impress.deleteByPath(state.data, key, value);
        }
        application.state.change(key, value, true);
      }
    }
  });

};
