'use strict';

if (impress.websocket) {

  impress.rpc = {};

  impress.rpc.mixinApplication = function(application) {

    application.rpc = {};

    application.rpc.initialize = function(client) {
      client.rpc = client.res.websocket;

      client.rpc.accept = function(namespaces) {
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
            parameters: parameters
          };
          data.callback = callback;
          client.rpc.callCollection[data.id] = data;
          connection.send(JSON.stringify(data));
        };

        var ns = {}, namespace;
        for (var nsName in namespaces) {
          namespace = {};
          ns[nsName] = namespace;
        }
        client.rpc.send({
          type: 'introspection',
          namespaces: ns
        });

        connection.on('message', function(message) {
          var dataName = message.type+'Data',
              data = message[dataName];
          console.log((new Date()) + ' RPC call: ' + data);
          var call = JSON.parse(data);
          client.rpc.send({
            id: call.id,
            type: 'result',
            result: {}
          });
        });

        connection.on('close', function(reasonCode, description) {
          console.log((new Date()) + ' RPC peer ' + connection.remoteAddress + ' disconnected.');
        });

        return connection;
      };
    };

    application.rpc.finalize = function(client) {
      var rpc = client.rpc;
      if (rpc && !rpc.isAccepted) rpc.request.reject();
    };
  
  };

}
