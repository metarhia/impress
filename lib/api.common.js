'use strict';

// Common utilities for Impress Application Server

api.common.node = {
  version: process.versions.node.split('.').map(parseInt)
};

api.common.falseness = () => false;
api.common.trueness = () => true;
api.common.emptyness = () => {};

const SUBST_REGEXP = /@([-.0-9a-zA-Z]+)@/g;

// Substitute variables with values
//   tpl - template body
//   data - global data structure to visualize
//   dataPath - current position in data structure
//   escapeHtml - escape html special characters if true
//   returns string
//
api.common.subst = (tpl, data, dataPath, escapeHtml) => (
  tpl.replace(SUBST_REGEXP, (s, key) => {
    let name;
    const pos = key.indexOf('.');
    if (pos === 0) name = dataPath + key; else name = key;
    let value = api.common.getByPath(data, name);
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
  })
);

// Return value from data structure
//   data - object/hash
//   dataPath - string in dot-separated path
//
api.common.getByPath = (data, dataPath) => {
  const path = dataPath.split('.');
  let i, len, next, obj = data;
  for (i = 0, len = path.length; i < len; i++) {
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
api.common.setByPath = (data, dataPath, value) => {
  const path = dataPath.split('.');
  let i, len, next, obj = data;
  for (i = 0, len = path.length; i < len; i++) {
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
api.common.deleteByPath = (data, dataPath) => {
  const path = dataPath.split('.');
  let i, len, next, obj = data;
  for (i = 0, len = path.length; i < len; i++) {
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

const HTML_ESCAPE_REGEXP = new RegExp('[&<>"\'/]', 'g');
const HTML_ESCAPE_CHARS = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'
};

// Escape string to protect characters from interpreting
//   as html special characters
//   Example: api.common.htmlEscape('5>=5') : '5&lt;=5'
//
api.common.htmlEscape = (content) => (
  content.replace(HTML_ESCAPE_REGEXP, char => HTML_ESCAPE_CHARS[char])
);

// Extract file extension in lower case with no dot
//   Example: api.common.fileExt('/dir/file.txt')
//   Result: 'txt'
//
api.common.fileExt = (fileName) => (
  api.path.extname(fileName).replace('.', '').toLowerCase()
);

// Compare time1 and time2 in milliseconds
//   Example: api.common.isTimeEqual(sinceTime, buffer.stats.mtime);
//   Result: boolean
//
api.common.isTimeEqual = (time1, time2) => (
  (new Date(time2)).getTime() === (new Date(time1)).getTime()
);

// Convert number to string, padding '0' char if single char
//
api.common.pad2 = (n) => (n < 10 ? '0' + n : '' + n);

// Current date and time in format: YYYY-MM-DD
//   now - date object, optional
//
api.common.nowDate = (now) => {
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
api.common.nowDateTime = (now) => {
  if (!now) now = new Date();
  return (
    now.getUTCFullYear() + '-' +
    api.common.pad2(now.getUTCMonth() + 1) + '-' +
    api.common.pad2(now.getUTCDate()) + ' ' +
    api.common.pad2(now.getUTCHours()) + ':' +
    api.common.pad2(now.getUTCMinutes())
  );
};

const UNDERLINE_REGEXP = /_/g;

// Convert to spinal case to camel case
//
api.common.spinalToCamel = (name) => (name
  .replace(UNDERLINE_REGEXP, '-')
  .split('-')
  .map((part, i) => ((i > 0) ? api.common.capitalize(part) : part))
  .join('')
);

const DURATION_UNITS = {
  days:    { rx: /(\d+)\s*d/, mul: 86400 },
  hours:   { rx: /(\d+)\s*h/, mul: 3600 },
  minutes: { rx: /(\d+)\s*m/, mul: 60 },
  seconds: { rx: /(\d+)\s*s/, mul: 1 }
};

// Parse duration to seconds
//   Example: duration('1d 10h 7m 13s')
//
api.common.duration = (s) => {
  if (typeof(s) === 'number') return s;
  let unit, match, key, result = 0;
  if (typeof(s) === 'string') {
    for (key in DURATION_UNITS) {
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
api.common.generateKey = (length, possible) => {
  const base = possible.length;
  const bitsCount = Math.ceil(Math.log2(Math.pow(base, length + 1) - 1));
  const bytes = api.crypto.randomBytes(Math.ceil(bitsCount / 8));
  let i, index, key = '';
  for (i = 0; i < length; i++) {
    index = api.common.longDivModBE(bytes, base);
    key += possible[index];
  }
  return key;
};

// Divide a long big endian encoded unsigned integer by a small one (i.e., not
// longer than a machine word) in-place and return the remainder
//   buffer - Buffer containing a divident
//   divisor - a divisor as a Number
//   Return: the remainder (Number)
//
api.common.longDivModBE = (buffer, divisor) => {
  if (divisor === 0) {
    throw new Error('Division by zero');
  }

  const bytesCount = Buffer.byteLength(buffer);
  let i, j, resultByte, byte, remainder = 0;

  for (i = 0; i < bytesCount; i++) {
    byte = buffer[i];
    resultByte = 0;
    for (j = 7; j > -1; j--) {
      remainder <<= 1;
      resultByte <<= 1;
      remainder |= (byte & (1 << j)) >> j;
      if (remainder >= divisor) {
        remainder -= divisor;
        resultByte |= 1;
      }
    }
    buffer[i] = resultByte;
  }

  return remainder;
};

api.common.hash = (password, salt) => (api.crypto
  .createHmac('sha512', salt)
  .update(password)
  .digest('hex')
);

api.common.validateHash = (hash, password, salt) => (
  api.common.hash(password, salt) === hash
);

// Generate an RFC4122-compliant GUID (UUID v4)
//
api.common.generateGUID = () => {
  const bytes = api.crypto.randomBytes(128);

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
api.common.ip2int = (ip = '127.0.0.1') => (
  ip.split('.').reduce((res, item) => (res << 8) + (+item), 0)
);

const ESCAPE_REGEXP_SPECIALS = [
  // order matters for these
  '-', '[', ']',
  // order doesn`t matter for any of these
  '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
];

const ESCAPE_REGEXP = new RegExp(
  '[' + ESCAPE_REGEXP_SPECIALS.join('\\') + ']', 'g'
);

// Escape RegExp string
// Example: escapeRegExp('/path/to/res?search=this.that')
//
api.common.escapeRegExp = (s) => s.replace(ESCAPE_REGEXP, '\\$&');

// Creates new instance of escaped RegExp
//
api.common.newEscapedRegExp = (s) => (
  new RegExp(api.common.escapeRegExp(s), 'g')
);

// Add single slash to the right with no duplicates
//
api.common.addTrailingSlash = (s) => s + (s.slice(-1) === '/' ? '' : '/');

// Remove trailing slash if it is
//
api.common.stripTrailingSlash = (s) => {
  if (s.substr(-1) === '/') return s.substr(0, s.length - 1);
  return s;
};

// Works like path.dirname except that add last char '/' if not root
//
api.common.dirname = (path) => {
  let dir = api.path.dirname(path);
  if (dir !== '/') dir += '/';
  return dir;
};

// Convert size in bytes to Kb, Mb, Gb and Tb
//
api.common.bytesToSize = (bytes) => {
  if (bytes === 0) return '0';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10);
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
api.common.sizeToBytes = (size) => {
  if (typeof(size) === 'number') return size;
  size = size.toUpperCase();
  let unit, match, result = 0;
  const units = api.common.sizeToBytes.units;
  if (typeof(size) === 'string') {
    let key, found = false;
    for (key in units) {
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

// Generate sequence array in range from..to
// Examples:
//   range(1, 5) = [1, 2, 3, 4, 5]
//
api.common.range = (from, to) => {
  if (to < from) return [];
  const len = to - from + 1;
  const range = new Array(len);
  let i;
  for (i = from; i <= to; i++) {
    range[i - from] = i;
  }
  return range;
};

// Generate sequence array from list or given range
//   seq
//   max - optional max
//
// Examples:
//   list: sequence([81, 82, 83]) = [81, 82, 83]
//   range from..to: sequence([81,,83]) = [81, 82, 83]
//   range from..count: sequence([81, [3]]) = [81, 82, 83]
//   range from..max-to: sequence([81, [-2]], 5) = [81, 82, 83]
//
api.common.sequence = (seq, max) => {
  const from = seq[0];
  let to = seq[1], res = seq;
  if (Array.isArray(to)) {
    const count = to[0] < 0 ? max + to[0] : to[0];
    res = api.common.range(from, from + count - 1);
  } else if (!to) {
    to = seq[2];
    res = api.common.range(from, to);
  }
  return res;
};

// Return random number less then one argument random(100)
// or between two argumants random(50,1 50)
//
api.common.random = (min, max) => {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
};

// Shuffle array
//
api.common.shuffle = (arr) => (
  arr.sort(() => Math.random() - 0.5)
);

// Clone object and extend it of ext specified
//
api.common.clone = (obj, ext) => {
  if (obj === null || typeof(obj) !== 'object') {
    return obj;
  }
  const copy = obj.constructor();
  let i, j;
  for (i in obj) {
    if (obj[i] && typeof(obj[i]) === 'object') {
      copy[i] = api.common.clone(obj[i]);
    } else {
      copy[i] = obj[i];
    }
  }
  if (ext !== null && typeof(ext) === 'object') {
    for (j in ext) {
      if (ext[j] && typeof(ext[j]) === 'object') {
        copy[j] = api.common.clone(ext[j]);
      } else {
        copy[j] = ext[j];
      }
    }
  }
  return copy;
};

const CAPITALIZE_REGEXP = /\w+/g;

// Capitalize string chars
// first char of each word is upper, other chars is lower
//
api.common.capitalize = (s) => (
  s.replace(CAPITALIZE_REGEXP, (word) => (
    word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
  ))
);

// Get substring from string s between prefix and suffix
//
api.common.between = (s, prefix, suffix) => {
  let i = s.indexOf(prefix);
  if (i > -1) s = s.substring(i + prefix.length);
  else return '';
  if (suffix) {
    i = s.indexOf(suffix);
    if (i > -1) s = s.substring(0, i);
    else return '';
  }
  return s;
};

const SCALAR_TYPES = ['boolean', 'number', 'string'];

// Return true for scalar vars and false for arrays and objects
//
api.common.isScalar = (variable) => SCALAR_TYPES.includes(typeof(variable));

// Merge arrays into first one
//
api.common.merge = (...args) => {
  const array = args[0];
  let i, ilen, j, jlen, arr, val;
  for (i = 1, ilen = args.length; i < ilen; i++) {
    arr = args[i];
    for (j = 0, jlen = arr.length; j < jlen; j++) {
      val = arr[j];
      if (!array.includes(val)) array.push(val);
    }
  }
  return array;
};

// Override/inherited
//
api.common.override = (obj, fn) => {
  fn.inherited = obj[fn.name];
  obj[fn.name] = fn;
};

// Get local IPs
//
api.common.localIPs = () => {
  let ips = api.common.localIPs.cache;
  if (ips) {
    return ips;
  } else {
    ips = [];
    let protocol, ifName, ifItem, i, len;
    const ifHash = api.os.networkInterfaces();
    for (ifName in ifHash) {
      ifItem = ifHash[ifName];
      for (i = 0, len = ifItem.length; i < len; i++) {
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
api.common.generateSID = (config) => {
  const key = api.common.generateKey(
    config.sessions.length - 4,
    config.sessions.characters
  );
  return key + api.common.crcSID(config, key);
};

// Calculate SID CRC
//
api.common.crcSID = (config, key) => {
  const md5 = api.crypto.createHash('md5');
  return md5.update(key + config.secret).digest('hex').substring(0, 4);
};

// Validate SID
//
api.common.validateSID = (config, sid) => {
  if (!sid) return false;
  const crc = sid.substr(sid.length - 4);
  const key = sid.substr(0, sid.length - 4);
  return api.common.crcSID(config, key) === crc;
};

// Extract host name from string where port may be defined 'host:port'
//   Return string constant if host is empty string
//
api.common.parseHost = (host) => {
  if (!host) host = 'no-host-name-in-http-headers';
  const portOffset = host.indexOf(':');
  if (portOffset > -1) host = host.substr(0, portOffset);
  return host;
};

const BOM_REGEXP = /^[\uBBBF\uFEFF]*/;

// Remove UTF-8 BOM
//
api.common.removeBOM = (s) => (
  typeof(s) === 'string' ? s.replace(BOM_REGEXP, '') : s
);

const ITEM_ESCAPE_REGEXP = /\\\*/g;

// Convert array of strings with '*' wildcards
//   e.g.: ['/css/*', '/index.html'] into one RegExp
//
api.common.arrayRegExp = (items) => {
  if (items && items.length) {
    items = items.map((item) => {
      item = api.common.escapeRegExp(item);
      return item.replace(ITEM_ESCAPE_REGEXP, '.*');
    });
    let ex;
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
api.common.sortCompareConfig = (s1, s2) => {
  let a = impress.CONFIG_FILES_PRIORITY.indexOf(s1);
  let b = impress.CONFIG_FILES_PRIORITY.indexOf(s2);
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
api.common.sortCompareDirectories = (a, b) => {
  let s1 = a.name, s2 = b.name;
  if (s1.charAt(0) !== '/') s1 = '0' + s1;
  if (s2.charAt(0) !== '/') s2 = '0' + s2;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

// Simple compare strings for sort
//   Example: files.sort(api.common.sortCompareByName);
//
api.common.sortCompareByName = (a, b) => {
  const s1 = a.name;
  const s2 = b.name;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

// Clear cache hash starts with given substring
//   cache - hash to clear
//   startsWith - string to compare with key start
//   fn - optional function to be called on each key
//
api.common.clearCacheStartingWith = (cache, startsWith, fn) => {
  Object.keys(cache).forEach((key) => {
    if (key.startsWith(startsWith)) {
      delete cache[key];
      if (fn) fn(key);
    }
  });
  return cache;
};

// Wrap API calls and write to debug log file
//   Example: api.common.logApiMethod('fs.stats')
//
api.common.logApiMethod = (fnPath) => {
  const originalMethod = api.common.getByPath(api, fnPath);
  api.common.setByPath(api, fnPath, (...args) => {
    let callback = null;
    if (args.length > 0) {
      callback = args[args.length - 1];
      if (typeof(callback) === 'function') args.pop();
      else callback = null;
    }
    const logArgs = api.json.stringify(args);
    if (impress && impress.log) {
      impress.log.debug(
        fnPath + '(' + logArgs.substring(1, logArgs.length - 1) + ', callback)'
      );
      const stack = new Error().stack.toString().split('\n');
      impress.log.debug(stack[2].trim());
    }
    if (callback) args.push(() => {
      const args = [];
      Array.prototype.push.apply(args, args);
      const logArgs = api.json.stringify(args);
      if (impress && impress.log) {
        impress.log.debug(
          fnPath + ' callback(' + logArgs.substring(1, logArgs.length - 1) + ')'
        );
      }
      callback(...args);
    });
    return originalMethod(...args);
  });
};

// Create instance of EventEmitter with abstract 'event'
//
api.common.eventEmitter = () => {
  const ee = new api.events.EventEmitter();
  const emit = ee.emit;
  ee.emit = (...args) => {
    const ar = args.slice(0);
    ar.unshift('*');
    emit.apply(ee, ar);
    emit.apply(ee, args);
  };
  return ee;
};

// Slash or backslash path separator
//
api.common.pathSeparator = process.isWin ? '\\' : '/';
