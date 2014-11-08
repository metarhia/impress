"use strict";

impress.state = {};

impress.state.mixinApplication = function (application) {

  var state = {};
  state.data = {};         // data structures for synchronization
  state.delta = {};        // delta to be synced at next sync event
  state.timer = null;      // timer object or null
  state.timeout = null;    // next timer event timestamp in milliseconds
  state.mode = 'lazy';     // syncronization mode: lazy, transaction
  state.started = false;   // transaction started or not
  state.changed = false;   // state changed locally and not synchronized
  state.subscribers = {}; // hash of arrays, key is path, value is array of function
  state.watchers = {};     // hash of arrays

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
    state.delta = {};
    removeTimer();
    state.mode = 'lazy';
    state.started = false;
  };

  // Increment value at path
  //   path - field path to incremental value
  //   value - increment by value, must be number
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.inc = function(path, value, delay) {
    if (typeof(value) !== 'number') return false;
    var item = state.delta[path];
    if (!item) {
      item = { value: value, type: 'inc' };
      state.delta[path] = item;
      state.changed = true;
    } else item.value += value;
    var data = impress.getByPath(state.data, path);
    if (typeof(data) === 'number') value = data + value;
    impress.setByPath(state.data, path, value);
    sync(path, item, delay);
    application.state.change(path, value, false);
  };

  // Decrement value at path
  //   path - field path
  //   value - decrement by value, must be number
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.dec = function(path, value, delay) {
    if (typeof(value) !== 'number') return false;
    state.inc(path, -value, delay);
  };

  // Set state value/object by path
  //   path - field path
  //   value - value to be assigned
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.set = function(path, value, delay) {
    impress.setByPath(state.data, path, value);
    sync(path, null, delay);
    application.state.change(path, value, false);
  };

  // Sync state value by path
  //   path - field path to incremental value
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.sync = function(path, delay) {
    sync(path, null, delay);
  };

  // Sync state
  //   path - path to value
  //   item - value to be synced (optional)
  //   delay - synchronization delar or immediate (optional)
  //
  function sync(path, item, delay) {
    if (!item) item = state.delta[path];
    var data = impress.getByPath(state.data, path);
    if (!item) {
      item = { value: data, type: 'set' };
      state.delta[path] = item;
      state.changed = true;
    }
    if (!state.started) {
      delay = duration(delay);
      if (delay === 0) sendDelta();
      else {
        var timeout = new Date().getTime() + delay;
        if (state.timer && state.timeout > timeout) removeTimer();
        if (!state.timer) {
          state.timer = setTimeout(sendDelta, timeout);
          state.timeout = timeout;
        }
      }
    }
  }

  // Remove timer
  //
  function removeTimer() {
    clearTimeout(state.timer);
    state.timer = null;
    state.timeout = null;
  }

  // Send state delta
  //
  function sendDelta() {
    removeTimer();
    var delta = state.delta;
    state.delta = {};
    application.events.sendToServer('impress:state', { node: impress.nodeId, delta: delta });
  }

  // Get state value/object by path
  //
  application.state.get = function(path) {
    return impress.getByPath(state.data, path);
  };

  // Delete state value/object by path
  //   path - field path to delete
  //   delay - delay interval in milliseconds or duration string, default immediate (optional)
  //
  application.state.delete = function(path, delay) {
    delete state.delta[path];
    impress.deleteByPath(state.data, path);
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
        i, callback, watchers, watchPath;
    if (typeof(value) === 'undefined') value = application.state.get(path);

    if (subscribers) {
      for (i = 0; i < subscribers.length; i++) {
        callback = subscribers[i];
        callback(path, value, remote);
      }
    }
    for (watchPath in state.watchers) {
      if (path.startsWith(watchPath)) {
        watchers = state.watchers[watchPath];
        for (i = 0; i < watchers.length; i++) {
          callback = watchers[i];
          callback(path, value, remote);
        }
      }
    }
  };

  // Receive state events from other processes
  //
  application.on('impress:state', function(data) {
    if (data.node !== impress.nodeId) {
      var delta, path, item, value;
      delta = data.delta;
      for (path in delta) {
        item = delta[path];
        if (item.type === 'inc') {
          value = impress.getByPath(state.data, path);
          value += item.value;
          impress.setByPath(state.data, path, value);
        } else if (item.type === 'set') {
          value = item.value;
          impress.setByPath(state.data, path, value);
        } else if (item.type === 'del') {
          value = undefined;
          impress.deleteByPath(state.data, path, value);
        }
        application.state.change(path, value, true);
      }
    }
  });

};
