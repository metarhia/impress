'use strict';

if (impress.websocket) {

  impress.rpc = {};

  impress.rpc.mixinApplication = function(application) {

    application.rpc = {};
    application.rpc.ifaces = {};

    application.rpc.initialize = function(client) {
      client.rpc = client.res.websocket;

      client.rpc.accept = function(ifaces) {
        client.rpc.isAccepted = true;
        client.rpc.nextMessageId = 0;
        client.rpc.callCollection = {};

        var connection = client.rpc.request.accept('', client.rpc.request.origin);
        client.rpc.connection = connection;

        client.rpc.send = function(data) {
          connection.send(JSON.stringify(data));
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

        application.rpc.loadIfaces(ifaces, function(err, ifaces) {
          client.rpc.send({
            type: 'introspection',
            ifaces: ifaces
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
    //   callback(err, iface) - callback on interface loaded
    //     err - error or null
    //     iface - loaded interface or null
    //
    application.rpc.getIface = function(path, callback) {
      application.preloadDirectory(path, 2, function(err, directories) {
        if (!err) {
          var result = {};
          api.async.each(directories, function(mName, cb) {
            var mPath = application.appDir + path + '/' + mName;
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
    //   ifaces - { iface1: '/path1', iface2: '/path2' }
    //   callback(err, result) - where result is a hash of loaded interfaces
    //
    application.rpc.loadIfaces = function(ifaces, callback) {
      var result = {},
          iNames = Object.keys(ifaces);
      api.async.each(iNames, function(iName, cb) {
        var iPath = ifaces[iName];
        application.rpc.getIface(iPath, function(err, iface) {
          result[iName] = iface;
          cb();
        });
      }, function() {
        callback(null, result);
      });
    };
  };

}
