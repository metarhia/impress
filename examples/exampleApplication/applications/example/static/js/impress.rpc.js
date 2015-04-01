'use strict';

// Impress RPC Client Library

(function(impress) {

  impress.rpc = {};

  impress.rpc.tabId = 0;
  impress.rpc.tabKey = '';
  impress.rpc.masterTab = false;
  impress.rpc.masterTabId = 0;
  impress.rpc.masterTabKey = '';
  impress.rpc.heartbeatInterval = 2000;
  impress.rpc.heartbeatEvent = null;
  impress.rpc.initialized = false;
  impress.rpc.initializationCallbacks = [];
  impress.rpc.supportsLocalStorage = false;
  impress.rpc.onCallbacks = {};

  impress.rpc.on = function(name, callback) {
    var namedEvent = impress.rpc.onCallbacks[name];
    if (!namedEvent) impress.rpc.onCallbacks[name] = [ callback ];
    else namedEvent.push(callback);
  };

  impress.rpc.emit = function(name, data) {
    var namedEvent = impress.rpc.onCallbacks[name];
    if (namedEvent) namedEvent.forEach(function(callback) {
      callback(name, data);
    });
  };

  // localStorage structure:
  //   impress.rpc.master = tabId e.g. 1
  //   impress.rpc.tab1 = Date.now() e.g. 1424185702490
  //   impress.rpc.tab2 = Date.now() e.g. 1424185704772
  //   impress.rpc.newtab = tabId (signal to master)
  //   impress.rpc.event = signal in format { name:s, data:d, time: Date.now() }

  impress.rpc.initializationWait = function(callback) {
    if (!impress.rpc.initialized) impress.rpc.initializationCallbacks.push(callback);
    else callback();
  };

  impress.rpc.initialize = function() {
    try {
      impress.rpc.supportsLocalStorage = 'localStorage' in window && window.localStorage !== null;
    } catch(e) {
    }
    if (impress.rpc.supportsLocalStorage) impress.rpc.initializeConnection();
  };

  impress.rpc.initializeDone = function() {
    impress.rpc.heartbeatEvent = setInterval(impress.rpc.listenHandler, impress.rpc.heartbeatInterval);
    impress.rpc.initialized = true;
    impress.rpc.initializationCallbacks.forEach(function(callback) {
      callback();
    });
    impress.rpc.initializationCallbacks = [];
  };

  impress.rpc.getFreeTab = function() {
    for (var id = 1;;id++) {
      if (typeof(localStorage['impress.rpc.tab' + id]) === 'undefined') return id;
    }
  };

  impress.rpc.initializeConnection = function() {
    if (!impress.rpc.initialized) {
      impress.rpc.tabId = impress.rpc.getFreeTab();
      impress.rpc.tabKey = 'impress.rpc.tab' + impress.rpc.tabId;
      impress.rpc.heartbeat();
      impress.rpc.heartbeatEvent = setInterval(impress.rpc.heartbeat, impress.rpc.heartbeatInterval);
      localStorage['impress.rpc.newtab'] = impress.rpc.tabId;
      global.addEventListener('storage', impress.rpc.onStorageChange, false);
    }
    var master = localStorage['impress.rpc.master'];
    if (master) impress.rpc.setMaster(master);
    else impress.rpc.createMaster();
    impress.rpc.initializeDone();
  };

  impress.rpc.heartbeat = function() {
    localStorage[impress.rpc.tabKey] = Date.now();
    if (impress.rpc.masterTab) impress.rpc.checkTabs();
    else impress.rpc.checkMaster();
  };

  impress.rpc.checkMaster = function() {
    var masterNow = parseInt(localStorage[impress.rpc.masterTabKey], 10);
    if (Date.now() - masterNow > impress.rpc.heartbeatInterval * 2) {
      var i, tabId, tabNow, key,
          keys = Object.keys(localStorage),
          maxId = 0,
          now = Date.now();
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (impress.startsWith(key, 'impress.rpc.tab')) {
          tabId = parseInt(key.match(/\d+/)[0], 10);
          tabNow = parseInt(localStorage[key], 10);
          if (now - tabNow < impress.rpc.heartbeatInterval * 2 && tabId > maxId) maxId = tabId;
        }
      }
      if (maxId === impress.rpc.tabId) impress.rpc.createMaster();
    }
  };

  impress.rpc.checkTabs = function() {
    var i, tabNow, key, keys = Object.keys(localStorage);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (key !== impress.rpc.tabKey && impress.startsWith(key, 'impress.rpc.tab')) {
        tabNow = parseInt(localStorage[key], 10);
        if (Date.now() - tabNow > impress.rpc.heartbeatInterval * 2) {
          localStorage.removeItem(key);
        }
      }
    }
  };

  impress.rpc.setMaster = function(id) {
    impress.rpc.masterTab = false;
    impress.rpc.masterTabId = id;
    impress.rpc.masterTabKey = 'impress.rpc.tab' + id;
  };

  impress.rpc.createMaster = function() {
    impress.rpc.masterTab = true;
    impress.rpc.masterTabId = impress.rpc.tabId;
    impress.rpc.masterTabKey = impress.rpc.tabKey;
    localStorage['impress.rpc.master'] = impress.rpc.tabId;
    impress.rpc.initializeDone();
  };

  impress.rpc.onStorageChange = function(e) {
    if (e.key === 'impress.rpc.event') {  
      var event = JSON.parse(e.newValue);
      impress.rpc.emit(event.name, event.data);
    } else if (impress.rpc.masterTab) {
      if (e.key === 'impress.rpc.newtab') impress.rpc.heartbeat();
      else if (e.key === 'impress.rpc.master') console.log('WARNING: master collision');
    } else {
      if (e.key === 'impress.rpc.master') impress.rpc.setMaster(e.newValue);
    }
  };

  impress.rpc.emitTabs = function(name, data) {
    localStorage['impress.rpc.event'] = JSON.stringify({ name: name, data: data, time: Date.now() });
  };

  impress.rpc.absoluteUrl = function(url) {
    if (url.charAt(0) === '/') {
      var site = window.location,
          absoluteUrl = 'ws';
      if (site.protocol === 'https:') absoluteUrl += 's';
      absoluteUrl += '://' + site.host + url;
      return absoluteUrl;
    } else return url;
  };

  impress.rpc.ws = function(url) {

    var rpc = {};

    var socket = new WebSocket(impress.rpc.absoluteUrl(url));
    rpc.socket = socket;
    rpc.socket.nextMessageId = 0;
    rpc.socket.callCollection = {};

    socket.onopen = function() {
      console.log('Connection opened');
    };

    socket.onclose = function() {
      console.log('Connection closed');
    };

    socket.onmessage = function(event) {
      console.log('Message from server: ' + event.data);
      var data = JSON.parse(event.data);
      if (data.type === 'introspection') {
        var nName, mName, mPath, namespace, obj, parts, sub;
        for (nName in data.namespaces) {
          namespace = data.namespaces[nName];
          obj = {};
          rpc[nName] = obj;
          for (mName in namespace) {
            mPath = nName + '.' + mName;
            if (mName.indexOf('.') > -1) {
              parts = mName.split('.');
              sub = {};
              sub[parts[1]] = fn(mPath);
              obj[parts[0]] = sub;
            } else obj[mName] = fn(mPath);
          }
        }
      } else if (data.id) {
        var call = rpc.socket.callCollection[data.id];
        if (call) {
          if (typeof(call.callback) === 'function') call.callback(data.result);
        }
      }
    };

    function fn(path) {
      return function() {
        var parameters = [];
        Array.prototype.push.apply(parameters, arguments);
        var cb = parameters.pop();
        rpc.call('post', path, parameters, cb);
      };
    }

    rpc.close = function() {
      socket.close();
      rpc.socket = null;
    };

    rpc.call = function(method, name, parameters, callback) {
      rpc.socket.nextMessageId++;
      var data = {
        id: 'C' + rpc.socket.nextMessageId,
        type: 'call',
        method: 'get',
        name: name,
        data: parameters
      };
      data.callback = callback;
      rpc.socket.callCollection[data.id] = data;
      socket.send(JSON.stringify(data));
    };

    return rpc;

  };

  impress.rpc.initialize();

} (global.impress = global.impress || {}));
