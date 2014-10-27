"use strict";

impress.state = {};

impress.state.mixinApplication = function (application) {

    application.state = {};
    application.state.data = {};      // data structures for synchronization
    application.state.cache = {};     // cache to be synced at next sync event
    application.state.timer = null;   // timer object or null
    application.state.timeout = null; // next timer event timestamp in milliseconds

    // Increment value at path
    //   path - field path to incremental value
    //   value - increment by value, must be number
    //   delay - delay interval in milliseconds or duration string
    //
    application.state.inc = function(path, value, delay) {
      if (typeof(value) !== 'number') return false;
      var cache = application.state.cache[path];
      if (!cache) {
        cache = { value: value, type: 'inc' };
        application.state.cache[path] = cache;
      } else cache.value += value;
      var data = impress.dataByPath(application.state.data, path);
      if (typeof(data) === 'number') data += value;
      else data = value;
      impress.setDataByPath(application.state.data, path, data);
      sync(path, cache, delay);
    };

    // Decrement value at path
    //
    application.state.dec = function(path, value, delay) {
      if (typeof(value) !== 'number') return false;
      application.state.inc(path, -value, delay);
    };

    // Sync cached value at path not frequently then delay
    //   path - field path to incremental value
    //   delay - delay interval in milliseconds or duration string, immediate if not set
    //
    application.state.sync = function(path, delay) {
      sync(path, null, delay);
    };

    // Private sync
    //
    function sync(path, cache, delay) {
      if (!cache) cache = application.state.cache[path];
      var data = impress.dataByPath(application.state.data, path);
      if (!cache) {
        cache = { value: data, type: 'set' };
        application.state.cache[path] = cache;
      }
      delay = duration(delay);
      if (delay === 0) {
        removeTimer();
        sendCache();
      } else {
        var timeout = new Date().getTime() + delay;
        if (application.state.timer && application.state.timeout > timeout) removeTimer();
        if (!application.state.timer) {
          application.state.timer = setTimeout(sendCache, timeout);
          application.state.timeout = timeout;
        }
      }
    }

    // Remove timer
    //
    function removeTimer() {
      clearTimeout(application.state.timer);
      application.state.timer = null;
      application.state.timeout = null;
    }

    // Send cache
    //
    function sendCache() {
      removeTimer();
      var cache = application.state.cache;
      application.state.cache = {};
      application.events.sendToServer('impress:state', { node: impress.nodeId, cache: cache });
    }

    // Receive state events from other processes
    //
    application.on('impress:state', function(data) {
      if (data.node !== impress.nodeId) {
        var cache, path, item, value;
        cache = data.cache;
        for (path in cache) {
          item = cache[path];
          if (item.type === 'inc') {
            value = impress.dataByPath(application.state.data, path);
            value += item.value;
          } else if (item.type === 'set') value = item.value;
          impress.setDataByPath(application.state.data, path, value);
        }
      }
    });

};
