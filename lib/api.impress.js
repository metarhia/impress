'use strict';

// Common utilities for Impress Application Server

// Get local IPs
//
api.impress.localIPs = [];
(function() {
  var protocol, ifItem, ifHash = api.os.networkInterfaces();
  for (var ifName in ifHash) {
    ifItem = ifHash[ifName];
    for (var i = 0, len = ifItem.length; i < len; i++) {
      protocol = ifItem[i];
      if (protocol.family === 'IPv4') {
        api.impress.localIPs.push(protocol.address);
      }
    }
  }
} ());

// Generate SID based on IAS configuration
//
api.impress.generateSID = function(config) {
  var key = api.common.generateKey(
    config.sessions.length - 4,
    config.sessions.characters
  );
  return key + api.impress.crcSID(config, key);
};

// Calculate SID CRC
//
api.impress.crcSID = function(config, key) {
  var md5 = api.crypto.createHash('md5');
  return md5.update(key + config.secret).digest('hex').substring(0, 4);
};

// Validate SID
//
api.impress.validateSID = function(config, sid) {
  if (!sid) return false;
  var crc = sid.substr(sid.length - 4),
      key = sid.substr(0, sid.length - 4);
  return api.impress.crcSID(config, key) === crc;
};

// Extract host name from string where port may be defined 'host:port'
//   Return string constant if host is empty string
//
api.impress.parseHost = function(host) {
  if (!host) host = 'no-host-name-in-http-headers';
  var portOffset = host.indexOf(':');
  if (portOffset >= 0) host = host.substr(0, portOffset);
  return host;
};

var BOM_REGEXP = /^[\uBBBF\uFEFF]*/;

// Remove UTF-8 BOM
//
api.impress.removeBOM = function(s) {
  if (typeof(s) === 'string') return s.replace(BOM_REGEXP, '');
  else return s;
};

var ITEM_ESCAPE_REGEXP = /\\\*/g;

// Convert array of strings with '*' wildcards
//   e.g.: ['/css/*', '/index.html'] into one RegExp
//
api.impress.arrayRegExp = function(items) {
  if (items && items.length) {
    items = items.map(function(item) {
      item = api.common.escapeRegExp(item);
      return item.replace(ITEM_ESCAPE_REGEXP, '.*');
    });
    var ex;
    if (items.length === 1) {
      ex = '^' + items[0] + '$';
    } else {
      ex = '^((' + items.join(')|(') + '))$';
    }
    return new RegExp(ex);
  } else return null;
};

// Compare function for sorting config files
//   Example: files.sort(api.impress.sortCompareConfig);
//
api.impress.sortCompareConfig = function(s1, s2) {
  var a = impress.CONFIG_FILES_PRIORITY.indexOf(s1),
      b = impress.CONFIG_FILES_PRIORITY.indexOf(s2);
  if (a === -1) a = Infinity;
  if (b === -1) b = Infinity;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

// Compare function for sorting files and directories
//   Directories goes first
//   Example: files.sort(api.impress.sortCompareDirectories);
//
api.impress.sortCompareDirectories = function(a, b) {
  var s1 = a.name, s2 = b.name;
  if (s1.charAt(0) !== '/') s1 = '0' + s1;
  if (s2.charAt(0) !== '/') s2 = '0' + s2;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

// Simple compare strings for sort
//   Example: files.sort(api.impress.sortCompareByName);
//
api.impress.sortCompareByName = function(a, b) {
  var s1 = a.name, s2 = b.name;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

// Clear cache hash starts with given substring
//   cache - hash to clear
//   startsWith - string to compare with key start
//   fn - optional function to be called on each key
//
api.impress.clearCacheStartingWith = function(cache, startsWith, fn) {
  var keys = Object.keys(cache);
  keys.forEach(function(key) {
    if (api.common.startsWith(key, startsWith)) {
      delete cache[key];
      if (fn) fn(key);
    }
  });
  return cache;
};

// Execute function in sandboxed context
//
api.impress.callInContextScript = api.vm.createScript(
  'callInContext(global);', 'impress.vm'
);

// Call previously saved method if it exists in context
//
api.impress.callInContextMethod = function(context) {
  if (context && context.__callInContext) context.__callInContext(context);
};

// Wrap API calls and write to debug log file
//   Example: api.impress.logApiMethod('fs.stats')
//
api.impress.logApiMethod = function(fnPath) {
  var originalMethod = api.common.getByPath(api, fnPath);
  api.common.setByPath(api, fnPath, function apiWrapper() {
    var callback = null, args = [];
    Array.prototype.push.apply(args, arguments);
    if (arguments.length > 0) {
      callback = arguments[arguments.length - 1];
      if (typeof(callback) === 'function') args.pop();
      else callback = null;
    }
    var logArgs = JSON.stringify(args);
    if (impress && impress.log) {
      impress.log.debug(
        fnPath + '(' + logArgs.substring(1, logArgs.length - 1) + ', callback)'
      );
      var stack = new Error().stack.toString().split('\n');
      impress.log.debug(stack[2].trim());
    }
    if (callback) args.push(function() {
      var args = [];
      Array.prototype.push.apply(args, arguments);
      var logArgs = JSON.stringify(args);
      if (impress && impress.log) {
        impress.log.debug(
          fnPath + ' callback(' + logArgs.substring(1, logArgs.length - 1) + ')'
        );
      }
      callback.apply(undefined, arguments);
    });
    return originalMethod.apply(undefined, args);
  });
};

// Create instance of EventEmitter with abstract 'event'
//
api.impress.eventEmitter = function() {
  var ee = new api.events.EventEmitter(),
      emit = ee.emit;
  ee.emit = function() {
    var args = [];
    Array.prototype.push.apply(args, arguments);
    args.unshift('*');
    emit.apply(ee, args);
    emit.apply(ee, arguments);
  };
  return ee;
};

// Slash or backslash path separator
//
api.impress.pathSeparator = process.isWin ? '\\' : '/';

// Preparing stack trace transformations
//
var STACK_REGEXP = [
  [api.path.dirname(__dirname) + api.impress.pathSeparator + 'node_modules', ''],
  [__dirname + api.impress.pathSeparator, ''],
  [process.cwd() + api.impress.pathSeparator + 'node_modules', ''],
  [process.cwd(), ''],
  [/\n\s{4,}at/g, ';'],
  [/\n/g, ';'],
  [/[\t\^]/g, ' '],
  [/\s{2,}/g, ' '],
  [/;\s;/g, ';']
];
STACK_REGEXP.forEach(function(item) {
  if (typeof(item[0]) === 'string') {
    item[0] = api.common.newEscapedRegExp(item[0]);
  }
});

// Log error with stack trace
//
api.impress.logException = function(err, application) {
  application = application || impress;
  var stack = err.stack;
  if (!stack) stack = err.toString();
  STACK_REGEXP.map(function(rx) {
    stack = stack.replace(rx[0], rx[1]);
  });
  if (err.isWarning && application.log && application.log.warning) {
    stack = stack.replace(/^Error: /, 'Warning: ');
    application.log.warning(stack);
  } else if (application.log && application.log.error) {
    application.log.error(stack);
  } else {
    console.log(err.stack);
  }
};
