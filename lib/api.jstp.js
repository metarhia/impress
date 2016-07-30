'use strict';

// JSTP JavaScript Transfer Protocol API

// Packet delimiter used to separate packets
//
api.jstp.PACKET_DELIMITER = ',{\f},';
api.jstp.DELIMITER_LENGTH = api.jstp.PACKET_DELIMITER.length;
api.jstp.CHUNKS_FIRST = new Buffer('[');
api.jstp.CHUNKS_LAST = new Buffer(']');
api.jstp.HANDSHAKE_TIMEOUT = 3000;

// Chunks is an Array of Buffer
//
api.jstp.Chunks = function() {
  this.items = [api.jstp.CHUNKS_FIRST];
};

// Chunks.add method adds new chunk to array and return
// packets (if any) as a string or null
//  chunk - instance of Buffer
//
api.jstp.Chunks.prototype.add = function(chunk) {
  var startPos = chunk.length - api.jstp.DELIMITER_LENGTH,
      delimiter = chunk.toString('utf8', startPos, chunk.length);
  if (delimiter === api.jstp.PACKET_DELIMITER) {
    var chunks = this.items;
    this.items = [api.jstp.CHUNKS_FIRST];
    chunk.fill(' ', startPos, chunk.length);
    chunks.push(chunk);
    chunks.push(api.jstp.CHUNKS_LAST);
    return api.jstp.parse(Buffer.concat(chunks).toString());
  } else {
    this.items.push(new Buffer(chunk));
    return null;
  }
};

// Filter delimiters from from packets
//   packets - array of object with expected delimiters
//   returns - array of object without delemiters
//
api.jstp.removeDelimiters = function(packets) {
  return packets.filter(function(packet, i) {
    return (i % 2 === 0);
  });
};

// Deserialize string to object, just data: objects and arrays
// no expressions and functions allowed in object definition
//   str - object serialized to string
//   return - deserialized JavaScript object
// Example: api.jstp.parse("{ field: 'value', node: { a: [5,6,7] } }")
//
api.jstp.parse = function(str) {
  var sandbox = api.vm.createContext({});
  var script = api.vm.createScript('(' + str + ')');
  return script.runInNewContext(sandbox);
};

// Serializer factory
//   additionalTypes - parsers for custom data types
//
api.jstp.createSerializer = function(additionalTypes) {
  function serialize(obj, i, arr) {
    var type;
    if (obj instanceof Array) type = 'array';
    else if (obj instanceof Date) type = 'date';
    else if (obj === null) type = 'undefined';
    else type = typeof(obj);
    var fn = serialize.types[type];
    return fn(obj, arr);
  }

  serialize.types = api.common.extend({
    number: function(n) { return n + ''; },
    string: function(s) { return '\'' + s.replace(/'/g, '\\\'') + '\''; },
    boolean: function(b) { return b ? 'true' : 'false'; },
    undefined: function(u, arr) { return !!arr ? '' : 'undefined'; },
    array: function(a) {
      return '[' + a.map(serialize).join(',') + ']';
    },
    object: function(obj) {
      var a = [], s, key;
      for (key in obj) {
        s = serialize(obj[key]);
        if (s !== 'undefined') {
          a.push(key + ':' + s);
        }
      }
      return '{' + a.join(',') + '}';
    }
  }, additionalTypes);

  return serialize;
};

// Serialize object to string, just data: objects and arrays
// no expressions and functions will be serialized
//   obj - JavaScript object to be serialized
//   return - object serialized to string
// Example: api.jstp.stringify({ field: 'value', node: { a: [5,6,7] } })
//
api.jstp.stringify = api.jstp.createSerializer({
  function: function() { return 'undefined'; },
  date: function(d) {
    return '\'' + d.toISOString().split('T')[0] + '\'';
  }
});

// Serialize object to string. Allowed: objects, arrays, functions
//   obj - JavaScript object to be serialized
//   return - object serialized to string
// Example: api.jstp.dump({ field: 'value', func: () => {} })
//
api.jstp.dump = api.jstp.createSerializer({
  function: function(fn) {
    return fn.toString();
  },
  date: function(d) {
    var date = d.toISOString().split('T')[0];
    return 'new Date(\'' + date + '\')';
  }
});

// Deserialize string to object with functions allowed in object definition
//   str - object serialized to string
//   return - deserialized JavaScript object
//
api.jstp.interprete = function(str) {
  var sandbox = api.vm.createContext({});
  var script = api.vm.createScript('(' + str + ')');
  var exported = script.runInNewContext(sandbox);
  for (var key in exported) {
    sandbox[key] = exported[key];
  }
  return exported;
};

// Serialize object to string, data and functions
// functions will be serialized with source code
//   obj - JavaScript object to be serialized
//   return - object serialized to string
// Example: api.jstp.serialize([['a','b'],[5,7],'c',5])
//
api.jstp.serialize = function(a, i, arr) {
  // Try to implement better then api.jstp.stringify
  if (a instanceof Array) {
    return '[' + a.map(api.jstp.serialize).join(',') + ']';
  } else {
    return a; // a may be number, boolean, string, etc.
    // like in api.jstp.stringify
    // also if a is { ... } we use ''
  }
};

// Deserialize array of scalar or array of array
// no objects allowed, just arrays and values
//   str - array serialized to string
//   return - deserialized JavaScript array
//
api.jstp.deserialize = function(str) {
  // Try to implement better then api.jstp.parse
};

// Packet constructor
//
api.jstp.Packet = function(kind, id, iface, verb, args) {
  this[kind] = [id];
  if (iface) this[kind].push(iface);
  this[verb] = args;

  // from: nodeId, app, target, data
};

api.jstp.connections = {};

// Establish JSTP connection to server
//   name - connection name
//   host - server host
//   port - server port
//   return - connection object and add it to api.jstp.connections
//
api.jstp.connect = function(name, host, port, secure) {
  var socket = secure ?
        new api.tls.TLSSocket() :
        new api.net.Socket();
  var connection = new api.jstp.Connection(socket);

  socket.connect({
    port: port,
    host: host,
  }, function() {
    //socket.write();
    if (secure && !socket.authorized) {
      console.log('TLS authorization error:', socket.authorizationError);
    }
    connection.emit('connect', connection);
  });

  api.jstp.connections[name] = connection;
  return connection;
};

api.jstp.environment = {};

// Initialize JSTP environment
//
api.jstp.init = function() {
  // Read or generate client unique identifier
  // Connect to configured servers
  // Save environment to api.jstp.environment
  // Return environment
};

// Servers dictionary for client-side
//
api.jstp.servers = {};

// Create JSTP Server
//
api.jstp.createServer = function(certificate) {
  var server = certificate ?
        api.tls.createServer(certificate, api.jstp.dispatcher) :
        api.net.createServer(api.jstp.dispatcher);
  server.clients = [];

  // Broadcast data to all client connections
  //  data - object to send
  //  from - source nodeId if retranslation
  //
  server.send = function(data, from) {
    server.clients.forEach(function(connection) {
      if (connection.remoteNodeId !== from) {
        connection.send(data);
      }
    });
  };

  return server;
};

// Dispatch requests
//   socket - an instance of net.Socket, tls.Socket or api.jstp.WebSocketAdapter
//   handshake packet: {handshake:[1,'appName'],sid:[pwdHash]}
//
api.jstp.dispatcher = function(socket) {
  var server = impress.config.servers[socket.server.serverName],
      connection = new api.jstp.Connection(socket, server);

  socket.setTimeout(api.jstp.HANDSHAKE_TIMEOUT, function() {
    if (!connection.application) {
      socket.destroy();
      connection.emit('timeout', connection);
    }
  });

  socket.on('error', function(err) {
    if (err.code === 'ECONNRESET') {
      console.log('Connection terminated by remote client');
    }
  });
};

// JSTP Connection Class
//   socket - instance of net.Socket, tls.TLSSocket
//            or api.jstp.WebSocketAdapter
//   server - instance of net.Server or tls.TLSServer
//
var Connection = function(socket, server) {
  var connection = this;
  api.events.EventEmitter.call(this);

  socket.connection = connection;
  connection.socket = socket;
  connection.cid = 0;
  connection.packetId = 0;
  connection.startTime = Date.now();
  if (server) {
    connection.kind = 'server';
    connection.server = server;
    connection.deltaId = -1;
  } else {
    connection.kind = 'client';
    connection.deltaId = 1;
  }
  connection.ip = socket.remoteAddress;
  connection.chunks = new api.jstp.Chunks();
  connection.callbacks = {};
  connection.interfaces = {};

  socket.on('data', function(data) {
    // console.dir({data:data.toString()});
    var packets = connection.chunks.add(data);
    if (packets) {
      packets = api.jstp.removeDelimiters(packets);
      connection.process(packets);
    }
  });

  socket.on('close', function() {
    connection.emit('close', connection);
    // console.log('Connection closed');
    var application = connection.application;
    if (application) {
      delete application.connections[connection.cid];
      application.emit('disconnect', connection);
    }
  });

  socket.on('error', function(err) {
    if (err.code === 'ECONNRESET') {
      // console.log('Connection terminated by remote client');
    }
    connection.emit('error', err, connection);
  });

};

api.util.inherits(Connection, api.events.EventEmitter);
api.jstp.Connection = Connection;

// Process received packets
//   packets - array of packet
//
Connection.prototype.process = function(packets) {
  // console.dir({process:packets});

  var cb, keys, kind, kindHandler, packet, packetId,
      connection = this;

  function sendCallback() {
    var error  = arguments[0],
        result = Array.prototype.slice.call(arguments, 1);
    if (error && error instanceof RemoteError) {
      error = error.jstpArray;
    } else if (error && !Array.isArray(error)) {
      error = [0, error.toString()];
    }
    connection.application.sandbox.connection = null;
    connection.callback(packetId, error, result);
  }

  var kinds = {

    handshake: function () {
      packetId = packet.handshake[0];
      if (packet.ok) {
        cb = connection.callbacks[packetId];
        connection.emit('handshake', packet.ok, connection);
        if (cb) {
          delete connection.callbacks[packetId];
          cb(null, packet.ok);
        }
      } else if (packet.error) {
        cb = connection.callbacks[packetId];
        if (cb) {
          delete connection.callbacks[packetId];
          cb(new RemoteError(packet.error[0], packet.error[1]));
        }
      } else {
        var sessionHash,
            appName = packet.handshake[1],
            remoteNodeId = keys[1],
            application = impress.applications[appName];

        if (application) {
          var username = keys[1],
              password;
          if (username) {
            password = packet[username];
          } else {
            username = null;
            password = null;
          }

          // TODO: check credentials
          connection.emit('handshakeRequest', application,
                          username, password, connection);

          connection.application = application;
          if (application === impress) {
            connection.remoteNodeId = remoteNodeId;
            sessionHash = 'cloudNodeIndex'; // TODO
          } else {
            sessionHash = 'sessionHash';
          }
          connection.cid = application.cid++;
          connection.emit('client', connection);
          application.emit('connect', connection);
          application.connections[connection.cid] = connection;
          connection.send({ handshake: [0], ok: sessionHash });
          connection.packetId += connection.deltaId;
        } else {
          connection.end({ handshake: [0], error: [10, 'Application not found'] });
        }
      }
    },

    call: function () {
      if (connection.application) {
        packetId = packet.call[0];
        var ifName = packet.call[1],
            apiInterface = connection.application.api[ifName],
            methodName = keys[1],
            args = packet[methodName];
        if (!apiInterface) {
          connection.callback(packetId, RemoteError.INTERFACE_NOT_FOUND.jstpArray);
          return;
        }
        var method = apiInterface[methodName];
        if (!method) {
          connection.callback(packetId, RemoteError.METHOD_NOT_FOUND.jstpArray);
          return;
        }
        connection.application.sandbox.connection = connection;
        args.push(sendCallback);
        method.apply(connection.application, args);
      }
    },

    callback: function () {
      packetId = packet.callback[0];
      // console.log('received call '+packetId);
      cb = connection.callbacks[packetId];
      if (cb) {
        delete connection.callbacks[packetId];
        if (packet.ok) {
          cb.apply(connection, [null].concat(packet.ok));
        } else if (packet.error) {
          cb(new RemoteError(packet.error[0], packet.error[1]));
        }
      }
    },

    event: function () {
      packetId = packet.event[0];
      var interfaceName = packet.event[1],
          eventName = keys[1],
          eventArgs = packet[eventName];
      connection.emit('event', interfaceName, eventName, eventArgs);
      var interfaceProxy = connection.interfaces[interfaceName];
      if (interfaceProxy) {
        interfaceProxy.emit(eventName, eventArgs, true);
      }
    },

    inspect: function () {
      if (connection.application) {
        packetId = packet.inspect[0];
        var ifName = packet.inspect[1],
            iface  = connection.application.api[ifName];
        if (iface) {
          connection.callback(packetId, null, Object.keys(iface));
        } else {
          connection.callback(packetId, RemoteError.INTERFACE_NOT_FOUND.jstpArray);
        }
      }
    }

  };

  while (packets.length) {
    packet = packets.shift();
    connection.emit('packet', packet, connection);
    keys = Object.keys(packet);
    kind = keys[0];
    kindHandler = kinds[kind];
    // console.dir({packet});
    if (kindHandler) kindHandler();
  }
};

// Create packet for connection
//   kind - packet classification: call, callback, event, state, stream, handshake, health
//   iface - interface name, optional string
//   verb - method name, string
//   args - arguments
//
Connection.prototype.packet = function(kind, iface, verb, args) {
  var packet = new api.jstp.Packet(kind, this.packetId, iface, verb, args);
  this.packetId += this.deltaId;
  return packet;
};

// Send data
//   data - hash or object
//
Connection.prototype.send = function(data) {
  var packet = api.jstp.stringify(data) + api.jstp.PACKET_DELIMITER;
  // console.dir({send:packet});
  this.socket.write(packet);
};

// Send data and close socket
//   data - hash or object
//
Connection.prototype.end = function(data) {
  var packet = api.jstp.stringify(data) + api.jstp.PACKET_DELIMITER;
  // console.dir({end:packet});
  this.socket.end(packet);
};

// Send call packet
//   interfaceName - interface containing required method
//   methodName - method name to be called
//   parameters - method call parameters
//   callback - function
//
Connection.prototype.call = function(interfaceName, methodName, parameters, callback) {
  var packet = this.packet('call', interfaceName, methodName, parameters),
      packetId = packet.call[0];
  // console.log('Connection.prototype.call: '+packetId);
  this.callbacks[packetId] = callback;
  this.send(packet);
};

// Send callback packet
//   packetId - id of original `call` packet
//   result - return this tesult to callback function
//
Connection.prototype.callback = function(packetId, error, result) {
  var packet;
  if (error) {
    packet = this.packet('callback', null, 'error', error);
  } else {
    packet = this.packet('callback', null, 'ok', result);
  }
  packet.callback[0] = packetId;
  // console.log('Connection.prototype.callback:'+packetId);
  // console.dir({callbackSending:packet});
  this.send(packet);
};

// Send event packet
//   interfaceName - name of interface sending event to
//   eventName - name of event
//   parameters - hash or object, event parameters
//
Connection.prototype.event = function(interfaceName, eventName, parameters) {
  var packet = this.packet('event', interfaceName, eventName, parameters);
  this.send(packet);
};

// Send state packet
//   path - path in data structure to be changed
//   verb - operation with data inc, dec, let, delete, push, pop, shift, unshift
//   value - delta or new value
//
Connection.prototype.state = function(path, verb, value) {
  var packet = this.packet('state', path, verb, value);
  this.send(packet);
};

// Send handshake packet
//   appName - application name
//   login - user login
//   password - password hash
//   callback - function callback
//
Connection.prototype.handshake = function(appName, login, password, callback) {
  var packet = this.packet('handshake', appName, login, password),
      packetId = packet.handshake[0];
  if (callback) this.callbacks[packetId] = callback;
  this.send(packet);
};

// Send introspection request packet
//   interfaceName - name of the interface to inspect
//   callback - callback function proxy object is passed to
//
Connection.prototype.inspect = function(interfaceName, callback) {
  var packet = this.packet('inspect', interfaceName, null, null),
      packetId = packet.inspect[0],
      connection = this;

  this.callbacks[packetId] = function(err) {
    if (err) return callback(err);
    var methods = Array.prototype.slice.call(arguments, 1);

    var proxy = new api.events.EventEmitter(),
        clientEmit = proxy.emit;
    proxy.emit = function(eventName, eventArgs, dontRetranslate) {
      if (!dontRetranslate) {
        connection.event(interfaceName, eventName, eventArgs);
      }
      clientEmit.call(proxy, eventName, eventArgs);
    };

    for (var i = 0; i < methods.length; i++) {
      connection.wrapRemoteMethod(proxy, interfaceName, methods[i]);
    }
    connection.interfaces[interfaceName] = proxy;
    callback(null, proxy);
  };

  this.send(packet);
};

// Wrap a remote method using the current connection
// and save into a proxy object
//   proxy - the proxy object
//   ifName - name of the interface
//   methodName - name of the method
//
Connection.prototype.wrapRemoteMethod = function(proxy, ifName, methodName) {
  var connection = this;
  proxy[methodName] = function() {
    var callback = arguments[arguments.length - 1];
    var args = Array.prototype.slice.call(arguments, 0, -1);
    connection.call(ifName, methodName, args, callback);
  };
};

// JSTP remote error class
// TODO: implement RPC stacktrace
//   code - error code
//   message - optional error message
//
function RemoteError(code, message) {
  message = message || RemoteError.defaultMessages[code];
  Error.call(this, message);

  this.code = code;
  this.message = message;

  if (message) {
    this.jstpArray = [code, message];
  } else {
    this.message = code;
    this.jstpArray = [code];
  }

  this.name = 'RemoteError';
}

api.util.inherits(RemoteError, Error);
api.jstp.RemoteError = RemoteError;

// Default messages for predefined error codes
// (see JSTP specs at https://github.com/metarhia/JSTP)
//
RemoteError.defaultMessages = {
  10: 'Application not found',
  11: 'Authentication failed',
  12: 'Interface not found',
  13: 'Incompatible interface',
  14: 'Method not found'
};

RemoteError.APP_NOT_FOUND = new RemoteError(10);
RemoteError.AUTH_FAILED = new RemoteError(11);
RemoteError.INTERFACE_NOT_FOUND = new RemoteError(12);
RemoteError.INTERFACE_INCOMPATIBLE = new RemoteError(13);
RemoteError.METHOD_NOT_FOUND = new RemoteError(14);

// WebSocket connection adapter class
//   connection - a WebSocket connection instance
//
function WebSocketAdapter(connection) {
  api.events.EventEmitter.call(this);
  this.ws = connection;

  connection.on('message', this._onMessage.bind(this));
  var self = this;
  var mirrorEvents = [['connect', 'open'], 'error', 'close', 'drain', 'pause', 'resume'];
  mirrorEvents.forEach(function(eventName) {
    var wsEvent, socketEvent;
    if (Array.isArray(eventName)) {
      wsEvent = eventName[0];
      socketEvent = eventName[1];
    } else {
      wsEvent = eventName;
      socketEvent = eventName;
    }
    connection.on(wsEvent, function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(socketEvent);
      self.emit.apply(self, args);
    });
  });
}

api.util.inherits(WebSocketAdapter, api.events.EventEmitter);
api.jstp.WebSocketAdapter = WebSocketAdapter;

// Send a packet of data
//   data - data to send over WebSocket connection
//
WebSocketAdapter.prototype.write = function(data) {
  this.ws.send(data);
};

// Send a packet of data and close connection
//   data - data to send over WebSocket connection
//
WebSocketAdapter.prototype.end = function(data) {
  this.ws.send(data);
  this.ws.close();
};

// Close the connection
//
WebSocketAdapter.prototype.destroy = function() {
  this.ws.close();
};

WebSocketAdapter.prototype._onMessage = function(message) {
  var type = message.type,
      data = message[type + 'Data'];

  if (type === 'utf8') {
    data = new Buffer(data);
  }
  this.emit('data', data);
};

// Set timeout using enroll
//   timeout - number of milliseconds
//   callback - function to invoke when timeout is fired
//
WebSocketAdapter.prototype.setTimeout = function(timeout, callback) {
  api.net.Socket.prototype.setTimeout.call(this, timeout, callback);
};

WebSocketAdapter.prototype._onTimeout = function() {
  this.emit('timeout');
};

// Serve JSTP over WebSocket connection
//   connection - WebSocket connection to use
//
api.jstp.serveOverWebsocket = function(connection) {
  var server = new api.events.EventEmitter();
  var socket = new WebSocketAdapter(connection);

  server.socket = socket;
  socket.server = server;

  server.socket.on('close', function() {
    server.emit('close');
    // Remove circular references so that GC collects
    // these objects faster
    server.socket = null;
    socket.server = null;
  });

  api.timers.setImmediate(function() {
    api.jstp.dispatcher(server.socket);
  });

  return server;
};
