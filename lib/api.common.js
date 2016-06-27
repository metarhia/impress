'use strict';

// Common utilities for Impress Application Server

api.common.falseness = function() { return false; };
api.common.trueness = function() { return true; };
api.common.emptyness = function() { };

api.common.safeFunc = function(fn) {
  return function() {
    if (typeof(fn) === 'function') {
      return fn.apply(this, arguments);
    }
  };
};

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

var HTML_ESCAPE_REGEXP = /[&<>"'\/]/g;
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

var GUID_REGEXP = /[xy]/g;

// Generate GUID/UUID RFC4122 compliant
//
api.common.generateGUID = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    GUID_REGEXP,
    function(c) {
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }
  );
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
  arr.sort(function () {
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

// Async parallel each
//   items - array of items to be processed
//   iterator(item, callback) - function to be called
//   done - done callback
//
api.common.each = function(items, iterator, done) {
  var counter = 0,
      len = items.length,
      finished = false;
  done = api.common.safeFunc(done);
  if (len === 0) done();
  else items.forEach(function(item) {
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
api.common.eachSeries = function(items, iterator, done) {
  var i = -1,
      len = items.length;
  done = api.common.safeFunc(done);
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
api.common.series = function(funcs, done) {
  var i = -1,
      len = funcs.length;
  done = api.common.safeFunc(done);
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
