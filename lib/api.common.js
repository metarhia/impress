'use strict';

// Common utilities for Impress Application Server

api.common.node = {
  version: process.versions.node.split('.').map(parseInt)
};

api.common.falseness = function() { return false; };
api.common.trueness = function() { return true; };
api.common.emptyness = function() { };

var SUBST_REGEXP = /@([\-\.0-9a-zA-Z]+)@/g;

// Substitute variables with values
//   tpl - template body
//   data - global data structure to visualize
//   dataPath - current position in data structure
//   escapeHtml - escape html special characters if true
//   returns string
//
api.common.subst = function(tpl, data, dataPath, escapeHtml) {
  return tpl.replace(SUBST_REGEXP, function(s, key) {
    var name, pos = key.indexOf('.');
    if (pos === 0) name = dataPath + key; else name = key;
    var value = api.common.getByPath(data, name);
    if (value === undefined) {
      if (key === '.value') {
        value = api.common.getByPath(data, dataPath);
      } else {
        value = '[undefined]';
      }
    }
    if (value === null) {
      value = '[null]';
    } else if (value === undefined) {
      value = '[undefined]';
    } else if (typeof(value) === 'object') {
      if (value.constructor.name === 'Date') {
        value = api.common.nowDateTime(value);
      } else if (value.constructor.name === 'Array') {
        value = '[array]';
      } else {
        value = '[object]';
      }
    }
    if (escapeHtml) value = api.common.htmlEscape(value);
    return value;
  });
};

// Return value from data structure
//   data - object/hash
//   dataPath - string in dot-separated path
//
api.common.getByPath = function(data, dataPath) {
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
api.common.setByPath = function(data, dataPath, value) {
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
api.common.deleteByPath = function(data, dataPath) {
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

var HTML_ESCAPE_REGEXP = new RegExp('[&<>"\'\/]', 'g');
var HTML_ESCAPE_CHARS = {
  '&': '&amp;','<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
};

// Escape string to protect characters from interpreting
//   as html special characters
//   Example: api.common.htmlEscape('5>=5') : '5&lt;=5'
//
api.common.htmlEscape = function(content) {
  return content.replace(HTML_ESCAPE_REGEXP, function(char) {
    return HTML_ESCAPE_CHARS[char];
  });
};

// Extract file extension in lower case with no dot
//   Example: api.common.fileExt('/dir/file.txt')
//   Result: 'txt'
//
api.common.fileExt = function(fileName) {
  return api.path.extname(fileName).replace('.', '').toLowerCase();
};

// Compare time1 and time2 in milliseconds
//   Example: api.common.isTimeEqual(sinceTime, buffer.stats.mtime);
//   Result: boolean
//
api.common.isTimeEqual = function(time1, time2) {
  return (new Date(time2)).getTime() === (new Date(time1)).getTime();
};

// Convert number to string, padding '0' char if single char
//
api.common.pad2 = function(n) {
  return n < 10 ? '0' + n : '' + n;
};

// Current date and time in format: YYYY-MM-DD
//   now - date object, optional
//
api.common.nowDate = function(now) {
  if (!now) now = new Date();
  return (
    now.getUTCFullYear() + '-' +
    api.common.pad2(now.getUTCMonth() + 1) + '-' +
    api.common.pad2(now.getUTCDate())
  );
};

// nowDateTime return date string in local timezone
//   Example: '2012-01-01 12:30'
//   now - date object, optional
//
api.common.nowDateTime = function(now) {
  if (!now) now = new Date();
  return (
    now.getUTCFullYear() + '-' +
    api.common.pad2(now.getUTCMonth() + 1) + '-' +
    api.common.pad2(now.getUTCDate()) + ' ' +
    api.common.pad2(now.getUTCHours()) + ':' +
    api.common.pad2(now.getUTCMinutes())
  );
};

var UNDERLINE_REGEXP = /_/g;

// Convert to spinal case to camel case
//
api.common.spinalToCamel = function(name) {
  var namePar = name.replace(UNDERLINE_REGEXP, '-').split('-');
  var nameRes = namePar.map(function(part, i) {
    if (i > 0) return api.common.capitalize(part);
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
api.common.duration = function(s) {
  if (typeof(s) === 'number') return s;
  var result = 0, unit, match;
  if (typeof(s) === 'string') {
    for (var key in DURATION_UNITS) {
      unit = DURATION_UNITS[key];
      match = s.match(unit.rx);
      if (match) {
        result += parseInt(match[1], 10) * unit.mul;
      }
    }
  }
  return result * 1000;
};

// Generate random key with specified length from string of possible characters
//
api.common.generateKey = function(length, possible) {
  var key = '';
  for (var i = 0; i < length; i++) {
    key += possible.charAt(api.common.random(0, possible.length - 1));
  }
  return key;
};

api.common.hash = function(password, salt) {
  var hmac = api.crypto.createHmac('sha512', salt);
  return hmac.update(password).digest('hex');
};

api.common.validateHash = function(hash, password, salt) {
  var hmac = api.common.hash(password, salt);
  return hash === hmac;
};

// Generate an RFC4122-compliant GUID (UUID v4)
//
api.common.generateGUID = function() {
  var bytes = api.crypto.randomBytes(128);

  bytes[6] &= 0x0F;
  bytes[6] |= 0x40;

  bytes[8] &= 0x3F;
  bytes[8] |= 0x80;

  return [
    bytes.toString('hex', 0, 4),
    bytes.toString('hex', 4, 6),
    bytes.toString('hex', 6, 8),
    bytes.toString('hex', 8, 10),
    bytes.toString('hex', 10, 16)
  ].join('-');
};

// IP Address from string e.g. '10.18.8.1' to signed integer
//
api.common.ip2int = function(ip) {
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

var ESCAPE_REGEXP = new RegExp(
  '[' + ESCAPE_REGEXP_SPECIALS.join('\\') + ']', 'g'
);

// Escape RegExp string
// Example: escapeRegExp('/path/to/res?search=this.that')
//
api.common.escapeRegExp = function(s) {
  return s.replace(ESCAPE_REGEXP, '\\$&');
};

// Creates new instance of escaped RegExp
//
api.common.newEscapedRegExp = function(s) {
  return new RegExp(api.common.escapeRegExp(s), 'g');
};

// Add single slash to the right with no duplicates
//
api.common.addTrailingSlash = function(s) {
  return s + (s.slice(-1) === '/' ? '' : '/');
};

// Remove trailing slash if it is
//
api.common.stripTrailingSlash = function(s) {
  if (s.substr(-1) === '/') return s.substr(0, s.length-1);
  return s;
};

// Works like path.dirname except that add last char '/' if not root
//
api.common.dirname = function(path) {
  var dir = api.path.dirname(path);
  if (dir !== '/') dir = dir + '/';
  return dir;
};

// Convert size in bytes to Kb, Mb, Gb and Tb
//
api.common.bytesToSize = function(bytes) {
  if (bytes === 0) return '0';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10);
  return (
    Math.round(bytes / Math.pow(1000, i), 2) +
    api.common.bytesToSize.sizes[i]
  );
};

api.common.bytesToSize.sizes = [
  '', ' Kb', ' Mb', ' Gb', ' Tb', ' Pb', ' Eb', ' Zb', ' Yb'
];

// Convert size as a string in any unit to butes
//
api.common.sizeToBytes = function(size) {
  if (typeof(size) === 'number') return size;
  size = size.toUpperCase();
  var result = 0,
      units = api.common.sizeToBytes.units,
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

// Metadata for api.common.sizeToBytes
//
api.common.sizeToBytes.units = {
  yb: { rx: /(\d+)\s*YB/, pow: 24 },
  zb: { rx: /(\d+)\s*ZB/, pow: 21 },
  eb: { rx: /(\d+)\s*EB/, pow: 18 },
  pb: { rx: /(\d+)\s*PB/, pow: 15 },
  tb: { rx: /(\d+)\s*TB/, pow: 12 },
  gb: { rx: /(\d+)\s*GB/, pow: 9 },
  mb: { rx: /(\d+)\s*MB/, pow: 6 },
  kb: { rx: /(\d+)\s*KB/, pow: 3 }
};

// Create array from given range of min and max
//
api.common.range = function(min, max) {
  var arr = [];
  for (var i = min; i <= max; i++) arr.push(i);
  return arr;
};

// Return random number less then one argument random(100)
// or between two argumants random(50,1 50)
//
api.common.random = function(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
};

// Shuffle array
//
api.common.shuffle = function(arr) {
  arr.sort(function() {
    return Math.random() - 0.5;
  });
  return arr;
};

// Extend obj with properties of ext
//
api.common.extend = function(obj, ext) {
  if (obj === undefined) obj = null;
  for (var property in ext) obj[property] = ext[property];
  return obj;
};

// Clone object and extend it of ext specified
//
api.common.clone = function(obj, ext) {
  if (obj === null || typeof(obj) !== 'object') {
    return obj;
  }
  var copy = obj.constructor();
  for (var i in obj) {
    if (obj[i] && typeof(obj[i]) === 'object') {
      copy[i] = api.common.clone(obj[i]);
    } else {
      copy[i] = obj[i];
    }
  }
  if (ext !== null && typeof(ext) === 'object') {
    for (var j in ext) {
      if (ext[j] && typeof(ext[j]) === 'object') {
        copy[j] = api.common.clone(ext[j]);
      } else {
        copy[j] = ext[j];
      }
    }
  }
  return copy;
};

var TRIM_REGEXP = /^\s+|\s+$/g;

// Trim non-whitespace chars
//
api.common.trim = function(s) {
  return s.replace(TRIM_REGEXP, '');
};

var LTRIM_REGEXP = /^\s+/;

// Trim left non-whitespace chars
//
api.common.ltrim = function(s) {
  return s.replace(LTRIM_REGEXP, '');
};

var RTRIM_REGEXP = /\s+$/;

// Trim right non-whitespace chars
//
api.common.rtrim = function(s) {
  return s.replace(RTRIM_REGEXP, '');
};

var CAPITALIZE_REGEXP = /\w+/g;

// Capitalize string chars
// first char of each word is upper, other chars is lower
//
api.common.capitalize = function(s) {
  return s.replace(CAPITALIZE_REGEXP, function(word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
};

// Pad string left with given padChar to required length
//
api.common.lpad = function(s, padChar, length) {
  var padCount = length - s.length + 1;
  if (padCount < 0) padCount = 0;
  return new Array(padCount).join(padChar) + s;
};

// Pad string right with given padChar to required length
//
api.common.rpad = function(s, padChar, length) {
  var padCount = length - s.length + 1;
  if (padCount < 0) padCount = 0;
  return s + new Array(padCount).join(padChar);
};

// Get substring from string s between prefix and suffix
//
api.common.between = function(s, prefix, suffix) {
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
api.common.isScalar = function(variable) {
  return SCALAR_TYPES.indexOf(typeof(variable)) !== -1;
};

// Define inArray, if not implemented
//
api.common.inArray = function(array, value) {
  return array ? array.indexOf(value) !== -1 : false;
};

// Merge arrays into first one
//
api.common.merge = function(/* arrays to merge */) {
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
api.common.override = function(obj, fn) {
  fn.inherited = obj[fn.name];
  obj[fn.name] = fn;
};

// Is string starts with given substring
//
api.common.startsWith = function(str, substring) {
  return str.indexOf(substring) === 0;
};

// Is string ends with given substring
//
api.common.endsWith = function(str, substring) {
  if (substring === '') return true;
  return str.slice(-substring.length) === substring;
};

// Is string contains given substring
//
api.common.contains = function(str, substring) {
  return str.indexOf(substring) > -1;
};

// Generate array in range from..to
// Examples:
//   range(1,5) = [1,2,3,4,5]
//   range(1,5) = [1,2,3,4,5]
//
api.common.range = function(from, to) {
  if (to < from) return [];
  var len = to - from + 1,
      range = Array(len);
  for (var i = from; i <= to; i++) {
    range[i-from] = i;
  }
  return range;
};

// Create buffer from string for different Node.js versions
//
api.common.buffer = function(s, encoding) {
  return (
    (api.common.node.version[0] < 7) ? new Buffer(s) : Buffer.from(s, encoding)
  );
};

// Get local IPs
//
api.common.localIPs = function() {
  var ips = api.common.localIPs.cache;
  if (ips) {
    return ips;
  } else {
    ips = [];
    var protocol, ifItem, ifHash = api.os.networkInterfaces();
    for (var ifName in ifHash) {
      ifItem = ifHash[ifName];
      for (var i = 0, len = ifItem.length; i < len; i++) {
        protocol = ifItem[i];
        if (protocol.family === 'IPv4') {
          ips.push(protocol.address);
        }
      }
    }
    api.common.localIPs.cache = ips;
    return ips;
  }
};

// Generate SID based on IAS configuration
//
api.common.generateSID = function(config) {
  var key = api.common.generateKey(
    config.sessions.length - 4,
    config.sessions.characters
  );
  return key + api.common.crcSID(config, key);
};

// Calculate SID CRC
//
api.common.crcSID = function(config, key) {
  var md5 = api.crypto.createHash('md5');
  return md5.update(key + config.secret).digest('hex').substring(0, 4);
};

// Validate SID
//
api.common.validateSID = function(config, sid) {
  if (!sid) return false;
  var crc = sid.substr(sid.length - 4),
      key = sid.substr(0, sid.length - 4);
  return api.common.crcSID(config, key) === crc;
};

// Extract host name from string where port may be defined 'host:port'
//   Return string constant if host is empty string
//
api.common.parseHost = function(host) {
  if (!host) host = 'no-host-name-in-http-headers';
  var portOffset = host.indexOf(':');
  if (portOffset >= 0) host = host.substr(0, portOffset);
  return host;
};

var BOM_REGEXP = /^[\uBBBF\uFEFF]*/;

// Remove UTF-8 BOM
//
api.common.removeBOM = function(s) {
  if (typeof(s) === 'string') return s.replace(BOM_REGEXP, '');
  else return s;
};

var ITEM_ESCAPE_REGEXP = /\\\*/g;

// Convert array of strings with '*' wildcards
//   e.g.: ['/css/*', '/index.html'] into one RegExp
//
api.common.arrayRegExp = function(items) {
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
//   Example: files.sort(api.common.sortCompareConfig);
//
api.common.sortCompareConfig = function(s1, s2) {
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
//   Example: files.sort(api.common.sortCompareDirectories);
//
api.common.sortCompareDirectories = function(a, b) {
  var s1 = a.name, s2 = b.name;
  if (s1.charAt(0) !== '/') s1 = '0' + s1;
  if (s2.charAt(0) !== '/') s2 = '0' + s2;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

// Simple compare strings for sort
//   Example: files.sort(api.common.sortCompareByName);
//
api.common.sortCompareByName = function(a, b) {
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
api.common.clearCacheStartingWith = function(cache, startsWith, fn) {
  var keys = Object.keys(cache);
  keys.forEach(function(key) {
    if (api.common.startsWith(key, startsWith)) {
      delete cache[key];
      if (fn) fn(key);
    }
  });
  return cache;
};

// Wrap API calls and write to debug log file
//   Example: api.common.logApiMethod('fs.stats')
//
api.common.logApiMethod = function(fnPath) {
  var originalMethod = api.common.getByPath(api, fnPath);
  api.common.setByPath(api, fnPath, function apiWrapper() {
    var callback = null, args = [];
    Array.prototype.push.apply(args, arguments);
    if (arguments.length > 0) {
      callback = arguments[arguments.length - 1];
      if (typeof(callback) === 'function') args.pop();
      else callback = null;
    }
    var logArgs = api.json.stringify(args);
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
      var logArgs = api.json.stringify(args);
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
api.common.eventEmitter = function() {
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
api.common.pathSeparator = process.isWin ? '\\' : '/';
