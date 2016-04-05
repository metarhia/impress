'use strict';

api.jstp = {};

// Deserialize string to object, just data: objects and arrays
// no expressions and functions allowed in object definition
//   str - object serialized to string
//   return - deserialized JavaScript object
//
api.jstp.parse = function(str) {
  var sandbox = api.vm.createContext({});
  var script = api.vm.createScript('(' + str + ')');
  return script.runInNewContext(sandbox);
};

// Deserialize array of scalar or array of array
// no objects allowed, just arrays and values
//   str - array serialized to string
//   return - deserialized JavaScript array
//
api.jstp.deserialize = function(str) {

};

// Deserialize string to object with expressions and functions
// allowed in object definition
//   str - object serialized to string
//   return - deserialized JavaScript object
//
api.jstp.interprete = function(str) {
  var sandbox = api.vm.createContext({});
  var script = api.vm.createScript('(' + str + ')');
  var exported = str.runInNewContext(sandbox);
  for (var key in exported) {
    sandbox[key] = exported[key];
  }
  return exported;
};

// Serialize object to string, just data: objects and arrays
// no expressions and functions will be serialized
//   obj - JavaScript object to be serialized
//   i - (optional) array index, for internal use only
//   arr - (optional) array, for internal use only
//   return - object serialized to string
//
api.jstp.stringify = function(obj, i, arr) {
  var type;
  if (obj instanceof Array) type = 'array';
  else if (obj instanceof Date) type = 'date';
  else if (obj === null) type = 'undefined';
  else type = typeof(obj);
  var fn = api.jstp.stringify.types[type];
  return fn(obj, arr);
};

api.jstp.stringify.types = {
  number: function(n) { return n + ''; },
  string: function(s) { return '\'' + s + '\''; },
  boolean: function(b) { return b ? 'true' : 'false'; },
  undefined: function(u, arr) { return !!arr ? '' : 'undefined'; },
  function: function() { return 'undefined'; },
  date: function(d) {
    return '\'' + d.toISOString().split('T')[0] + '\'';
  },
  array: function(a) {
    return '[' + a.map(api.jstp.stringify).join(',') + ']';
  },
  object: function(obj) {
    var a = [], s;
    for (var key in obj) {
      s = api.jstp.stringify(obj[key]);
      if (s !== 'undefined') {
        a.push(key + ':' + s);
      }
    }
    return '{' + a.join(',') + '}';
  }
};

// Serialize object to string, data and functions
// functions will be serialized with source code
//   obj - JavaScript object to be serialized
//   i - (optional) array index, for internal use only
//   arr - (optional) array, for internal use only
//   return - object serialized to string
//
api.jstp.serialize = function(obj, i, arr) {

};

// Convert data into object using metadata
//   data - array to be mapped to given metadata by key position
//   metadata - metadata definition
//   return - JavaScript object
//
api.jstp.dataToObject = function(data, metadata) {

};

// Convert object into data using metadata
//   obj - JavaScript object to be mapped to array by key position
//   metadata - metadata definition
//   return - JavaScript object
//
api.jstp.objectToData = function(obj, metadata) {

};

// Mixin metada methods and metadata to data
//   data - data array
//   metadata - metadata object
//   return - fake object with get/set
//
api.jstp.jsrd = function(data, metadata) {
  var obj = {},
      keys = Object.keys(metadata);
  keys.forEach(function(fieldName, index) {
    Object.defineProperty(obj, fieldName, {
      enumerable: true,
      get: function () {
        return data[index];
      },
      set: function(value) {
        data[index] = value;
      }
    });
  });
  return obj;
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
