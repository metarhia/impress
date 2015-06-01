'use strict';

if (impress.websocket) {

  impress.rpc = {};

  // RPC Application pligin initialization
  //
  impress.rpc.mixinApplication = function(application) {

    application.rpc = {};
    application.rpc.namespaces = {};

    // RPC initialization (to be called automatically by Impress core)
    //
    application.rpc.initialize = function(client) {
      client.rpc = client.res.websocket;

      client.rpc.accept = function(namespaces) {
        client.rpc.isAccepted = true;
        client.rpc.nextMessageId = 0;
        client.rpc.callCollection = {};

        var connection = client.rpc.request.accept('', client.rpc.request.origin);
        client.rpc.connection = connection;

        client.rpc.send = function(data) {
          if (connection.connected) connection.send(JSON.stringify(data));
        };

        client.rpc.call = function(name, parameters, callback) {
          client.rpc.nextMessageId++;
          var data = {
            id: 'S' + client.rpc.nextMessageId,
            type: 'call',
            name: name,
            data: parameters
          };
          data.callback = callback;
          client.rpc.callCollection[data.id] = data;
          connection.send(JSON.stringify(data));
        };

        connection.on('message', function(message) {
          var dataName = message.type+'Data',
              data = message[dataName];
          console.log((new Date()) + ' RPC call: ' + data);
          var packet = JSON.parse(data);
          if (packet.type === 'call') {
            // implement here: send call result to client
            // packet fields:
            //   id: call id, 'C'+id
            //   type: call
            //   method: get, post...
            //   name: method name
            //   data: call parameters
            client.rpc.send({
              id: packet.id,
              type: 'result',
              result: {}
            });
          } else if (packet.type === 'result') {
            // implement here: receive call result from client
            // packet fields:
            //   id: call id, 'S'+id (equal to call id sent from server)
            //   type: result
            //   method: get, post...
            //   name: method name
            //   data: call parameters

          } else if (packet.type === 'event') {
            // implement here: receive event from client
            // packet fields:
            //   type: event
            //   name: method name
            //   data: call parameters
          }
        });

        connection.on('close', function(reasonCode, description) {
          console.log((new Date()) + ' RPC peer ' + connection.remoteAddress + ' disconnected.');
        });

        application.rpc.loadNamespaces(namespaces, function(err, ns) {
          client.rpc.send({
            type: 'introspection',
            namespaces: ns
          });
        });

        return connection;
      };
    };

    application.rpc.finalize = function(client) {
      var rpc = client.rpc;
      if (rpc && !rpc.isAccepted) rpc.request.reject();
    };
  
    // Get interface from cahce or load from disk
    //   path - path to interface relative to /app
    //   callback(err, namespace) - callback on interface loaded
    //     err - error or null
    //     namespace - loaded interface or null
    //
    application.rpc.getNamespace = function(path, callback) {
      application.preloadDirectory(path, 2, function(err, directories) {
        if (!err) {
          var result = {};
          api.async.each(directories, function(mName, cb) {
            var mPath = '/app/' + path + '/' + mName;
            result[mName] = {
              get: application.cache.scripts[mPath + '/get.js'],
              post: application.cache.scripts[mPath + '/post.js']
            };
            cb();
          }, function() {
            callback(null, result);
          });
        } else callback(err, null);
      });
    };

    // Load interfaces
    //   namespaces - { namespace1: '/path1', namespace2: '/path2' }
    //   callback(err, result) - where result is a hash of loaded interfaces
    //
    application.rpc.loadNamespaces = function(namespaces, callback) {
      var result = {},
          nNames = Object.keys(namespaces);
      api.async.each(nNames, function(nName, cb) {
        var iPath = namespaces[nName];
        application.rpc.getNamespace(iPath, function(err, namespace) {
          result[nName] = namespace;
          cb();
        });
      }, function() {
        callback(null, result);
      });
    };
  };

}
