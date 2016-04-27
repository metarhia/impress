'use strict';

// JSTP JavaScript Transfer Protocol API

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

  serialize.types = Object.assign({
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
}

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
    return fn.toString()
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

// Establish JSTP connection to server
//   name - connection name
//   host - server host
//   port - server port
//   return - connection object and add it to api.jstp.connections
//
api.jstp.connect = function(name, host, port) {
  var socket = new api.net.Socket();
  var connection = {};
  connection.socket = socket;
  connection.packetId = 0;

  connection.send = function(packet) {
    connection.socket.write(packet);
  };

  connection.call = function(interfaceName, methodName, parameters, callback) {
    var packet = {};
    connection.packetId++;
    packet.call = [connection.packetId, interfaceName];
    packet[methodName] = parameters;
    connection.send(packet);
  };

  connection.event = function(interfaceName, eventName, parameters) {
    var packet = {};
    connection.packetId++;
    packet.event = [connection.packetId, interfaceName];
    packet[eventName] = parameters;
    connection.send(packet);
  };

  socket.connect({
    port: port,
    host: host,
  }, function() {
    socket.write();
    socket.on('data', function(data) {

    });
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
