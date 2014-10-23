"use strict";

impress.state = {};

impress.state.mixinApplication = function (application) {

    application.state = {};
    application.state.data = {};
    application.state.cache = {};

    // Increment value at path
    //   path - field path to incremental value
    //   value - increment by value
    //   delay - minimum delay interval in milliseconds or string for duration() function format, immediate if not set
    //
    application.state.inc = function(path, value, delay) {
      var data, cache = application.state.cache[path];
      if (typeof(cache) === 'undefined') {
        data = value;
        cache = { value: value, type: 'inc', timer: null };
        application.state.cache[path] = cache;
      } else cache.value += value;
      sync(path, cache, delay);
    };

    // Sync cached value at path
    //   path - field path to incremental value
    //   delay - minimum delay interval in milliseconds, immediate if not set
    //
    application.state.sync = function(path, delay) {
      var cache = application.state.cache[path];
      sync(path, cache, delay);
    };

    // Private sync
    //
    function sync(path, cache, delay) {
      if (!cache) return false;
      if (cache.timer) clearTimeout(cache.timer);

      delay = duration(delay);
      var timeout = new Date().getTime() + delay;

      var doSync = function () {
        application.events.sendGlobal('impress:state', { path: path, type: cache.type, data: cache.value });
      };

      if (delay > 0) cache.timer = setTimeout(doSync, timeout);
      else doSync();
    }

    // Receive events from other processes
    //
    application.on('impress:state', function(data) {
    	console.log('Event received by: '+impress.nodeId);
    	console.dir({ data:data });
    });

};
