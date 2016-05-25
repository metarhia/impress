'use strict';

// JSTP JavaScript Transfer Protocol API

// Packet delimiter used to separate packets
//
api.jstp.PACKET_DELIMITER = ',{\f},';
api.jstp.DELIMITER_LENGTH = api.jstp.PACKET_DELIMITER.length;
api.jstp.CHUNKS_FIRST = new Buffer('[');
api.jstp.CHUNKS_LAST = new Buffer(']');

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
  return packets.filter(function(packet) {
    return !api.util.isArray(packet);
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
  };

  serialize.types = api.common.extend({
    number: function(n) { return n + ''; },
    string: function(s) { return '\'' + s.replace(/'/g, '\\\'') + '\''; },
    boolean: function(b) { return b ? 'true' : 'false'; },
    undefined: function(u, arr) { return !!arr ? '' : 'undefined'; },
    array: function(a) {
      return '[' + a.map(serialize).join(',') + ']';
    },
    object: function(obj) {
      var a = [], s;
      for (var key in obj) {
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

// Create 
//
api.jstp.packet = function(kind, id, iface, verb, args) {
  var packet = {};
  packet[kind] = [id];
  if (iface) packet[kind].push(iface);
  packet[verb] = args;
  return packet;

  /*
  from: impress.nodeId,
  type: 'call',
  app: app,
  name: name,
  target: target,
  data: data
  */
};

// Establish JSTP connection to server
//   name - connection name
//   host - server host
//   port - server port
//   return - connection object and add it to api.jstp.connections
//
api.jstp.connect = function(name, host, port) {
  var socket = new api.net.Socket(),
      connection = api.jstp.Connection(socket);

  socket.connect({
    port: port,
    host: host,
  }, function() {
    socket.write();
    /*socket.on('data', function(data) {

    });*/
  });

  api.jstp.connections[name] = connection;
  return connection;
};

api.jstp.environment = {};
api.jstp.connections = {};
api.jstp.systems = {};

// Start JSTP environment
//   return - JSTP environment
//
api.jstp.start = function() {
  // Read or generate client unique identifier
  // Connect to configured servers
  // Save environment to api.jstp.environment
  // Return environment
};

api.jstp.systems.add = function() {

};

// JSTP Connection Class
//   application - instance of application
//   socket - instance of http.Socket
//
var Connection = function(socket, server) {
  var connection = this;

  socket.connection = connection;
  connection.socket = socket;
  connection.cid = 0;
  connection.packets = [];
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

  socket.on('data', function(data) {
    var packets = connection.chunks.add(data);
    if (packets) {
      packets = api.jstp.removeDelimiters(packets);
      connection.packets = connection.packets.concat(packets);
      connection.process();
    }
  });

  socket.on('close', function() {
    //console.log('Connection closed');
    var application = connection.application;
    if (application) {
      delete application.connections[connection.cid];
      application.emit('disconnect', connection);
    }
  });

  socket.on('error', function(err) {
    if (err.code === 'ECONNRESET') {
      //console.log('Connection terminated by remote client');
    }
  });

};

api.jstp.Connection = Connection;

Connection.prototype.process = function() {
  var packet, connection = this;

  function cb(result) {
    connection.callback(packetId, result);
  }
  
  while (connection.packets.length) {
    packet = connection.packets.shift();
    //console.dir({ process: packet });
    var keys = Object.keys(packet);
    if (keys[0] === 'handshake') {
      var appName = packet['handshake'][1],
          application = impress.applications[appName];
      if (application) {
        //console.log('Selected app: ' + application.name);
        connection.application = application;
        connection.cid = application.cid++;
        application.emit('connect', connection);
        application.connections[connection.cid] = connection;
      } else {
        connection.end({ handshake: [-1], error: [4] });
      }
    } else if (keys[0] === 'call') {
      if (connection.application) {
        var packetId = packet['call'][0],
            ifName = packet['call'][1],
            apiInterface = connection.application.api[ifName],
            methodName = keys[1],
            args = packet[methodName];
        if (apiInterface) {
          apiInterface[methodName](connection, args, cb);
        }
      }
    }
  }
};


Connection.prototype.send = function(data) {
  var packet = api.jstp.stringify(data);
  this.socket.write(packet);
};

Connection.prototype.end = function(data) {
  var packet = api.jstp.stringify(data);
  this.socket.end(packet);
};

Connection.prototype.call = function(interfaceName, methodName, parameters, callback) {
  var id = this.packetId + this.deltaId,
      packet = api.jstp.packet('call', id, interfaceName, methodName, parameters);
  this.send(packet);
};

Connection.prototype.callback = function(packetId, result) {
  var id = this.packetId + this.deltaId,
      packet = api.jstp.packet('callback', id, null, 'ok', result);
  this.send(packet);
};

Connection.prototype.event = function(interfaceName, eventName, parameters) {
  var id = this.packetId + this.deltaId,
      packet = api.jstp.packet('event', id, interfaceName, eventName, parameters);
  this.send(packet);
};
