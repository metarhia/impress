'use strict';

// Common utilities for Impress Application Server
//
api.impress = {};

api.impress.falseness = function() { return false; };
api.impress.trueness = function() { return true; };
api.impress.emptyness = function() { };
api.impress.isWin = !!process.platform.match(/^win/);
api.impress.safeFunc = function(fn) {
  return function() {
    if (typeof(fn) === 'function') {
      return fn.apply(this, arguments);
    }
  };
};

// Get local IPs
//
api.impress.localIPs = [];
(function() {
  var protocol, ifItem, ifHash = api.os.networkInterfaces();
  for (var ifName in ifHash) {
    ifItem = ifHash[ifName];
    for (var i = 0, len = ifItem.length; i < len; i++) {
      protocol = ifItem[i];
      if (protocol.family === 'IPv4') api.impress.localIPs.push(protocol.address);
    }
  }
} ());

// Generate SID based on IAS configuration
//
api.impress.generateSID = function(config) {
  var key = api.impress.generateKey(
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

var SUBST_REGEXP = /@([\-\.0-9a-zA-Z]+)@/g;

// Substitute variables with values
//   tpl - template body
//   data - global data structure to visualize
//   dataPath - current position in data structure
//   escapeHtml - escape html special characters if true
//   returns string
//
api.impress.subst = function(tpl, data, dataPath, escapeHtml) {
  return tpl.replace(SUBST_REGEXP, function(s, key) {
    var name, pos = key.indexOf('.');
    if (pos === 0) name = dataPath + key; else name = key;
    var value = api.impress.getByPath(data, name);
    if (value === undefined) {
      if (key === '.value') value = api.impress.getByPath(data, dataPath);
      else value = '[undefined]';
    }
    if (value === null) value = '[null]';
    else if (value === undefined) value = '[undefined]';
    else if (typeof(value) === 'object') {
      if (value.constructor.name === 'Date') value = api.impress.nowDateTime(value);
      else if (value.constructor.name === 'Array') value = '[array]';
      else value = '[object]';
    }
    if (escapeHtml) value = api.impress.htmlEscape(value);
    return value;
  });
};

// Return value from data structure
//   data - object/hash
//   dataPath - string in dot-separated path
//
api.impress.getByPath = function(data, dataPath) {
  var path = dataPath.split('.'),
      next, obj = data;
  for (var i = 0, len = path.length; i < len; i++) {
    next = obj[path[i]];
    if (next === undefined || next === null) return next;
    obj = next;
  }
  return obj;
};

// Set value in data structure by path
//   data - object/hash
//   dataPath - string in dot-separated path
//   value - value to be assigned
//
api.impress.setByPath = function(data, dataPath, value) {
  var path = dataPath.split('.'),
      next, obj = data;
  for (var i = 0, len = path.length; i < len; i++) {
    next = obj[path[i]];
    if (i === path.length - 1) {
      obj[path[i]] = value;
      return true;
    } else {
      if (next === undefined || next === null) {
        if (typeof(obj) === 'object') {
          next = {};
          obj[path[i]] = next;
        } else return false;
      }
      obj = next;
    }
  }
  return false;
};

// Delete data from data structure by path
//   data - object/hash
//   dataPath - string in dot-separated path
//
api.impress.deleteByPath = function(data, dataPath) {
  var path = dataPath.split('.'),
      next, obj = data;
  for (var i = 0, len = path.length; i < len; i++) {
    next = obj[path[i]];
    if (i === path.length - 1) {
      if (obj.hasOwnProperty(path[i])) {
        delete obj[path[i]];
        return true;
      }
    } else {
      if (next === undefined || next === null) return false;
      obj = next;
    }
  }
  return false;
};

var HTML_ESCAPE_REGEXP = /[&<>"'\/]/g;
var HTML_ESCAPE_CHARS = { '&': '&amp;','<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escape string to protect characters from interpreting as html special characters
//   Example: api.impress.htmlEscape('5>=5') : '5&lt;=5'
//
api.impress.htmlEscape = function(content) {
  return content.replace(HTML_ESCAPE_REGEXP, function(char) {
    return HTML_ESCAPE_CHARS[char];
  });
};

// Extract file extension in lower case with no dot
//   Example: api.impress.fileExt('/dir/file.txt')
//   Result: 'txt'
//
api.impress.fileExt = function(fileName) {
  return api.path.extname(fileName).replace('.', '').toLowerCase();
};

// Compare time1 and time2 in milliseconds
//   Example: api.impress.isTimeEqual(sinceTime, buffer.stats.mtime);
//   Result: boolean
//
api.impress.isTimeEqual = function(time1, time2) {
  return (new Date(time2)).getTime() === (new Date(time1)).getTime();
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
      item = api.impress.escapeRegExp(item);
      return item.replace(ITEM_ESCAPE_REGEXP, '.*');
    });
    var ex;
    if (items.length === 1) ex = '^' + items[0] + '$';
    else ex = '^((' + items.join(')|(') + '))$';
    return new RegExp(ex);
  } else return null;
};

// Convert number to string, padding '0' char if single char
//
api.impress.pad2 = function(n) {
  return n < 10 ? '0' + n : '' + n;
};

// Current date and time in format: YYYY-MM-DD
//   now - date object, optional
//
api.impress.nowDate = function(now) {
  if (!now) now = new Date();
  return (
    now.getUTCFullYear() + '-' +
    api.impress.pad2(now.getUTCMonth() + 1) + '-' +
    api.impress.pad2(now.getUTCDate())
  );
};

// nowDateTime return date string in local timezone
//   Example: '2012-01-01 12:30'
//   now - date object, optional
//
api.impress.nowDateTime = function(now) {
  if (!now) now = new Date();
  return (
    now.getUTCFullYear() + '-' +
    api.impress.pad2(now.getUTCMonth() + 1) + '-' +
    api.impress.pad2(now.getUTCDate()) + ' ' +
    api.impress.pad2(now.getUTCHours()) + ':' +
    api.impress.pad2(now.getUTCMinutes())
  );
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
  for (var key in cache) {
    if (api.impress.startsWith(key, startsWith)) {
      delete cache[key];
      if (fn) fn(key);
    }
  }
  return cache;
};

var UNDERLINE_REGEXP = /_/g;

// Convert to spinal case to camel case
//
api.impress.spinalToCamel = function(name) {
  var namePar = name.replace(UNDERLINE_REGEXP, '-').split('-');
  var nameRes = namePar.map(function(part, i) {
    if (i > 0) return api.impress.capitalize(part);
    else return part;
  });
  return nameRes.join('');
};

var DURATION_UNITS = {
  days:    { rx: /(\d+)\s*d/, mul: 86400 },
  hours:   { rx: /(\d+)\s*h/, mul: 3600 },
  minutes: { rx: /(\d+)\s*m/, mul: 60 },
  seconds: { rx: /(\d+)\s*s/, mul: 1 }
};

// Parse duration to seconds
//   Example: duration('1d 10h 7m 13s')
//
api.impress.duration = function(s) {
  if (typeof(s) === 'number') return s;
  var result = 0, unit, match;
  if (typeof(s) === 'string') {
    for (var key in DURATION_UNITS) {
      unit = DURATION_UNITS[key];
      match = s.match(unit.rx);
      if (match) result += parseInt(match[1], 10) * unit.mul;
    }
  }
  return result * 1000;
};

// Generate random key with specified length from string of possible characters
//
api.impress.generateKey = function(length, possible) {
  var key = '';
  for (var i = 0; i < length; i++) {
    key += possible.charAt(api.impress.random(0, possible.length - 1));
  }
  return key;
};

var GUID_REGEXP = /[xy]/g;

// Generate GUID/UUID RFC4122 compliant
//
api.impress.generateGUID = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(GUID_REGEXP, function(c) {
    var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

// IP Address from string e.g. '10.18.8.1' to signed integer
//
api.impress.ip2int = function(ip) {
  if (!ip) ip = '127.0.0.1';
  return ip.split('.').reduce(function(res, item) {
    var num = +item;
    return (res << 8) + num;
  }, 0);
};

var ESCAPE_REGEXP_SPECIALS = [
  // order matters for these
  '-', '[', ']',
  // order doesn`t matter for any of these
  '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
];

var ESCAPE_REGEXP = new RegExp('[' + ESCAPE_REGEXP_SPECIALS.join('\\') + ']', 'g');

// Escape RegExp string
// Example: escapeRegExp('/path/to/res?search=this.that')
//
api.impress.escapeRegExp = function(s) {
  return s.replace(ESCAPE_REGEXP, '\\$&');
};

// Add single slash to the right with no duplicates
//
api.impress.addTrailingSlash = function(s) {
  return s + (s.slice(-1) === '/' ? '' : '/');
};

// Remove trailing slash if it is
//
api.impress.stripTrailingSlash = function(s) {
  if (s.substr(-1) === '/') return s.substr(0, s.length-1);
  return s;
};

// Works like path.dirname except that add last char '/' if not root
//
api.impress.dirname = function(path) {
  var dir = api.path.dirname(path);
  if (dir !== '/') dir = dir + '/';
  return dir;
};

// Convert size in bytes to Kb, Mb, Gb and Tb
//
api.impress.bytesToSize = function(bytes) {
  if (bytes === 0) return '0';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10);
  return Math.round(bytes / Math.pow(1000, i), 2) + api.impress.bytesToSize.sizes[i];
};

api.impress.bytesToSize.sizes = ['', ' Kb', ' Mb', ' Gb', ' Tb', ' Pb', ' Eb', ' Zb', ' Yb'];

// Convert size as a string in any unit to butes
//
api.impress.sizeToBytes = function(size) {
  if (typeof(size) === 'number') return size;
  size = size.toUpperCase();
  var result = 0,
      units = api.impress.sizeToBytes.units,
      unit, match;
  if (typeof(size) === 'string') {
    var found = false;
    for (var key in units) {
      unit = units[key];
      match = size.match(unit.rx);
      if (match) {
        result += parseInt(match[1], 10) * Math.pow(10, unit.pow);
        found = true;
      }
    }
    if (!found) result = parseInt(size, 10);
  }
  return result;
};

// Metadata for api.impress.sizeToBytes
//
api.impress.sizeToBytes.units = {
  yb: { rx:/(\d+)\s*YB/, pow:24 },
  zb: { rx:/(\d+)\s*ZB/, pow:21 },
  eb: { rx:/(\d+)\s*EB/, pow:18 },
  pb: { rx:/(\d+)\s*PB/, pow:15 },
  tb: { rx:/(\d+)\s*TB/, pow:12 },
  gb: { rx:/(\d+)\s*GB/, pow:9 },
  mb: { rx:/(\d+)\s*MB/, pow:6 },
  kb: { rx:/(\d+)\s*KB/, pow:3 }
};

// Return random number less then one argument random(100) or between two argumants random(50,150)
//
api.impress.random = function(min, max) {
  if (arguments.length === 1) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
};

// Shuffle array
//
api.impress.shuffle = function(arr) {
  var i, j, x;
  for (i = arr.length; i; j = Math.floor(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
  return arr;
};

// Extend obj with properties of ext
//
api.impress.extend = function(obj, ext) {
  if (obj === undefined) obj = null;
  for (var property in ext) obj[property] = ext[property];
  return obj;
};

// Clone object and extend it of ext specified
//
api.impress.clone = function(obj, ext) {
  if (obj === null || typeof(obj) !== 'object') return obj;
  var copy = obj.constructor();
  for (var i in obj) {
    if (obj[i] && typeof(obj[i]) === 'object') copy[i] = api.impress.clone(obj[i]);
    else copy[i] = obj[i];
  }
  if (ext !== null && typeof(ext) === 'object') {
    for (var j in ext) {
      if (ext[j] && typeof(ext[j]) === 'object') copy[j] = api.impress.clone(ext[j]);
      else copy[j] = ext[j];
    }
  }
  return copy;
};

var TRIM_REGEXP = /^\s+|\s+$/g;

// Trim non-whitespace chars
//
api.impress.trim = function(s) {
  return s.replace(TRIM_REGEXP, '');
};
  
var LTRIM_REGEXP = /^\s+/;

// Trim left non-whitespace chars
//
api.impress.ltrim = function(s) {
  return s.replace(LTRIM_REGEXP, '');
};

var RTRIM_REGEXP = /\s+$/;

// Trim right non-whitespace chars
//
api.impress.rtrim = function(s) {
  return s.replace(RTRIM_REGEXP, '');
};

var CAPITALIZE_REGEXP = /\w+/g;

// Capitalize string chars (first char of each word is upper, other chars is lower)
//
api.impress.capitalize = function(s) {
  return s.replace(CAPITALIZE_REGEXP, function(word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
};

// Pad string left with given padChar to required length
//
api.impress.lpad = function(s, padChar, length) {
  var padCount = length - s.length + 1;
  if (padCount < 0) padCount = 0;
  return new Array(padCount).join(padChar) + s;
};

// Pad string right with given padChar to required length
//
api.impress.rpad = function(s, padChar, length) {
  var padCount = length - s.length + 1;
  if (padCount < 0) padCount = 0;
  return s + new Array(padCount).join(padChar);
};

// Get substring from string s between prefix and suffix
//
api.impress.between = function(s, prefix, suffix) {
  var i = s.indexOf(prefix);
  if (i >= 0) s = s.substring(i + prefix.length);
  else return '';
  if (suffix) {
    i = s.indexOf(suffix);
    if (i >= 0) s = s.substring(0, i);
    else return '';
  }
  return s;
};

var SCALAR_TYPES = ['boolean', 'number', 'string'];

// Return true for scalar vars and false for arrays and objects
//
api.impress.isScalar = function(variable) {
  return SCALAR_TYPES.indexOf(typeof(variable)) !== -1;
};

// Define inArray, if not implemented
//
api.impress.inArray = function(array, value) {
  return array ? array.indexOf(value) !== -1 : false;
};

// Merge arrays into first one
//
api.impress.merge = function(/* arrays to merge */) {
  var arr, array = arguments[0];
  for (var i = 1, ilen = arguments.length; i < ilen; i++) {
    arr = arguments[i];
    for (var j = 0, jlen = arr.length; j < jlen; j++) {
      if (array.indexOf(arr[j]) === -1) array.push(arr[j]);
    }
  }
  return array;
};

// Override/inherited
//
api.impress.override = function(obj, fn) {
  fn.inherited = obj[fn.name];
  obj[fn.name] = fn;
};

// Is string starts with given substring
//
api.impress.startsWith = function(str, substring) {
  return str.indexOf(substring) === 0;
};

// Is string ends with given substring
//
api.impress.endsWith = function(str, substring) {
  if (substring === '') return true;
  return str.slice(-substring.length) === substring;
};

// Is string contains given substring
//
api.impress.contains = function(str, substring) {
  return str.indexOf(substring) > -1;
};

// Execute function in sandboxed context
//
api.impress.callInContextScript = api.vm.createScript('callInContext(global);', 'impress.vm');

// Call previously saved method if it exists in context
//
api.impress.callInContextMethod = function(context) {
  if (context && context.__callInContext) context.__callInContext(context);
};

// Wrap API calls and write to debug log file
//   Example: api.impress.logApiMethod('fs.stats')
//
api.impress.logApiMethod = function(fnPath) {
  var originalMethod = api.impress.getByPath(api, fnPath);
  api.impress.setByPath(api, fnPath, function apiWrapper() {
    var callback = null, args = [];
    Array.prototype.push.apply(args, arguments);
    if (arguments.length > 0) {
      callback = arguments[arguments.length - 1];
      if (typeof(callback) === 'function') args.pop();
      else callback = null;
    }
    var logArgs = JSON.stringify(args);
    impress.log.debug(fnPath + '(' + logArgs.substring(1, logArgs.length - 1) + ',callback)');
    if (callback) args.push(function() {
      var args = [];
      Array.prototype.push.apply(args, arguments);
      var logArgs = JSON.stringify(args);
      impress.log.debug(fnPath + ' callback(' + logArgs.substring(1, logArgs.length - 1) + ')');
      callback.apply(undefined, arguments);
    });
    return originalMethod.apply(undefined, args);
  });
};

// Impress safe require
//   moduleName - name or alias of required module
//
api.impress.require = function(moduleName) {
  var mr = api.registry.find(moduleName);
  var npmName;
  if (mr) npmName = mr.npm || mr.name;
  else npmName = moduleName;
  var lib = null;
  try {
    lib = require(npmName);
  } catch(err) {
    if (api.cluster.isMaster) {
      var msg = 'Module "' + (npmName || moduleName) + '" can`t be loaded';
      if (api.impress.startsWith(err.message, 'Cannot find module')) {
        msg += ', you need to install it using npm';
      } else msg += ', ' + err.toString();
      if (impress.log) impress.log.warning(msg);
      else console.log(msg);
    }
  }
  return lib;
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
api.impress.pathSeparator = api.impress.isWin ? '\\' : '/';

var STACK_REGEXP = [
  [new RegExp(api.impress.escapeRegExp(api.path.dirname(__dirname) + api.impress.pathSeparator + 'node_modules'), 'g'), ''],
  [new RegExp(api.impress.escapeRegExp(__dirname + api.impress.pathSeparator), 'g'), ''],
  [new RegExp(api.impress.escapeRegExp(process.cwd() + api.impress.pathSeparator + 'node_modules'), 'g'), ''],
  [new RegExp(api.impress.escapeRegExp(process.cwd()), 'g'), ''],
  [/\n\s{4,}at/g, ';'],
  [/\n/g, ';'],
  [/[\t\^]/g, ' '],
  [/\s{2,}/g, ' '],
  [/;\s;/g, ';']
];

// Log error with stack trace
//
api.impress.logException = function(err, application) {
  application = application || impress;
  var stack = err.stack;
  if (!stack) stack = err.toString();
  STACK_REGEXP.map(function(rx) {
    stack = stack.replace(rx[0], rx[1]);
  });
  if (application.log && application.log.error) application.log.error(stack);
  else console.log(err.stack);
};

// Async parallel each
//   items - array of items to be processed
//   iterator(item, callback) - function to be called
//   done - done callback
//
api.impress.each = function(items, iterator, done) {
  var counter = 0,
      len = items.length,
      finished = false;
  done = api.impress.safeFunc(done);
  items.forEach(function(item) {
    iterator(item, function(result) {
      if (result instanceof Error) {
        if (!finished) done(result);
        finished = true;
      } else {
        counter++;
        if (counter >= len) done();
      }
    });
  });
};

// Async items in series each
//   items - array of items to be processed
//   iterator(item, callback) - functionto be called
//   done - done callback
//
api.impress.eachSeries = function(items, iterator, done) {
  var i = -1,
      len = items.length;
  done = api.impress.safeFunc(done);
  function next() {
    i++;
    if (i >= len) done();
    else iterator(items[i], function(result) {
      if (result instanceof Error) done(result);
      else next();
    });
  }
  next();
};

// Async function array in series
//   funcs - array of functiontons be called
//   done - done callback
//
api.impress.series = function(funcs, done) {
  var i = -1,
      len = funcs.length;
  done = api.impress.safeFunc(done);
  function next() {
    i++;
    if (i >= len) done();
    else funcs[i](function(result) {
      if (result instanceof Error) done(result);
      else next();
    });
  }
  next();
};
