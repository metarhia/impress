// Impress RPC Client Library

(function(impress) {

  impress.rpc = {};

  impress.rpc.ws = function(url) {

    var rpc = {};

    var socket = new WebSocket(url);
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

} (global.impress = global.impress || {}));
