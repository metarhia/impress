'use strict';

// Common utilities for Impress Application Server

api.common.node = {
  version: process.versions.node.split('.').map(parseInt)
};

api.common.falseness = () => false;
api.common.trueness = () => true;
api.common.emptyness = () => {};

const SUBST_REGEXP = /@([-.0-9a-zA-Z]+)@/g;

api.common.subst = (
  // Substitute variables
  tpl, // template body
  data, // global data structure to visualize
  dataPath, // current position in data structure
  escapeHtml // escape html special characters if true
  // Return: string
) => (
  tpl.replace(SUBST_REGEXP, (s, key) => {
    const pos = key.indexOf('.');
    const name = pos === 0 ? dataPath + key : key;
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

api.common.getByPath = (
  data, // data - object/hash
  dataPath // string in dot-separated path
) => {
  const path = dataPath.split('.');
  let i, len, next, obj = data;
  for (i = 0, len = path.length; i < len; i++) {
    next = obj[path[i]];
    if (next === undefined || next === null) return next;
    obj = next;
  }
  return obj;
};

api.common.setByPath = (
  data, // object/hash
  dataPath, // string in dot-separated path
  value // value to be assigned
) => {
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
        } else {
          return false;
        }
      }
      obj = next;
    }
  }
  return false;
};

api.common.deleteByPath = (
  data, // object/hash
  dataPath // string in dot-separated path
) => {
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

api.common.htmlEscape = (
  content // string to escape
  // Example: api.common.htmlEscape('5>=5') : '5&lt;=5'
) => (
  content.replace(HTML_ESCAPE_REGEXP, char => HTML_ESCAPE_CHARS[char])
);

api.common.fileExt = (
  fileName // extract file extension in lower case with no dot
  // Example: api.common.fileExt('/dir/file.txt')
  // Return: 'txt'
) => (
  api.path.extname(fileName).replace('.', '').toLowerCase()
);

api.common.isTimeEqual = (
  time1, // Compare time1
  time2 // and time2 in milliseconds
  // Example: api.common.isTimeEqual(sinceTime, buffer.stats.mtime);
  // Return: boolean
) => (
  (new Date(time2)).getTime() === (new Date(time1)).getTime()
);

api.common.pad2 = (n) => (n < 10 ? '0' + n : '' + n);

api.common.nowDate = (
  now // date object (optional) to YYYY-MM-DD
) => {
  if (!now) now = new Date();
  return (
    now.getUTCFullYear() + '-' +
    api.common.pad2(now.getUTCMonth() + 1) + '-' +
    api.common.pad2(now.getUTCDate())
  );
};

api.common.nowDateTime = (
  now // date object (optional) to YYYY-MM-DD hh:mm
) => {
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

api.common.spinalToCamel = (
  name // convert spinal case to camel case
) => (name
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

api.common.duration = (
  s // parse duration to seconds
  // Example: duration('1d 10h 7m 13s')
) => {
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

api.common.generateKey = (
  length, // random key length
  possible // string of possible characters
) => {
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

api.common.longDivModBE = (
  // Divide a long big endian encoded unsigned integer by a small one
  // (i.e., not longer than a machine word) in-place and return the remainder
  buffer, // Buffer containing a divident
  divisor // a divisor as a Number
  // Return: the remainder (Number)
) => {
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

api.common.generateGUID = (
  // Generate an RFC4122-compliant GUID (UUID v4)
) => {
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

api.common.escapeRegExp = (
  s // escapeRegExp('/path/to/res?search=this.that')
) => s.replace(ESCAPE_REGEXP, '\\$&');

api.common.newEscapedRegExp = (s) => (
  new RegExp(api.common.escapeRegExp(s), 'g')
);

api.common.addTrailingSlash = (s) => s + (s.endsWith('/') ? '' : '/');

api.common.stripTrailingSlash = (s) => (
  s.endsWith('/') ? s.substr(0, s.length - 1) : s
);

api.common.dirname = (path) => {
  let dir = api.path.dirname(path);
  if (dir !== '/') dir += '/';
  return dir;
};

api.common.bytesToSize = (
  bytes // number to be converted to size Kb, Mb, Gb and Tb
) => {
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

api.common.sizeToBytes = (
  size // string with units to be converted to number
) => {
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

api.common.range = (
  from, // sequence start
  to // sequence end
  // Example: range(1, 5) = [1, 2, 3, 4, 5]
) => {
  if (to < from) return [];
  const len = to - from + 1;
  const range = new Array(len);
  let i;
  for (i = from; i <= to; i++) {
    range[i - from] = i;
  }
  return range;
};

api.common.sequence = (
  seq, // array
  max // optional max
  // Examples:
  // list: sequence([81, 82, 83]) = [81, 82, 83]
  // range from..to: sequence([81,,83]) = [81, 82, 83]
  // range from..count: sequence([81, [3]]) = [81, 82, 83]
  // range from..max-to: sequence([81, [-2]], 5) = [81, 82, 83]
) => {
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

api.common.random = (min, max) => {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
};

api.common.shuffle = (arr) => (
  arr.sort(() => Math.random() - 0.5)
);

const CAPITALIZE_REGEXP = /\w+/g;

api.common.capitalize = (s) => (
  s.replace(CAPITALIZE_REGEXP, (word) => (
    word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
  ))
);

api.common.between = (
  s, // string to extract substring between prefix and suffix
  prefix, // substring before needed fragment
  suffix // substring after needed fragment
) => {
  let i = s.indexOf(prefix);
  if (i === -1) return '';
  s = s.substring(i + prefix.length);
  if (suffix) {
    i = s.indexOf(suffix);
    if (i === -1) return '';
    s = s.substring(0, i);
  }
  return s;
};

const SCALAR_TYPES = ['boolean', 'number', 'string'];

api.common.isScalar = (variable) => SCALAR_TYPES.includes(typeof(variable));

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

api.common.override = (
  obj, // object containing function to override
  fn // function, name will be used to find function inside object
  // Hint: previous function will be accessible by obj.fnName.inherited
) => {
  fn.inherited = obj[fn.name];
  obj[fn.name] = fn;
};

api.common.localIPs = () => {
  let ips = api.common.localIPs.cache;
  if (ips) return ips;
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
};

api.common.generateSID = (
  config // { length, characters, secret }
) => {
  const key = api.common.generateKey(
    config.length - 4,
    config.characters
  );
  return key + api.common.crcSID(config, key);
};

api.common.crcSID = (
  config, // { length, characters, secret }
  key // key to calculate CRC
) => {
  const md5 = api.crypto.createHash('md5');
  return md5.update(key + config.secret).digest('hex').substring(0, 4);
};

api.common.validateSID = (
  config, // { length, characters, secret }
  sid // session id string
) => {
  if (!sid) return false;
  const crc = sid.substr(sid.length - 4);
  const key = sid.substr(0, sid.length - 4);
  return api.common.crcSID(config, key) === crc;
};

api.common.parseHost = (
  host // host or empty string, may contain :port
  // Return: host without port but not empty
) => {
  if (!host) host = 'no-host-name-in-http-headers';
  const portOffset = host.indexOf(':');
  if (portOffset > -1) host = host.substr(0, portOffset);
  return host;
};

const BOM_REGEXP = /^[\uBBBF\uFEFF]*/;

api.common.removeBOM = (
  s // string possibly starts with UTF-8 BOM
) => (
  typeof(s) === 'string' ? s.replace(BOM_REGEXP, '') : s
);

const ITEM_ESCAPE_REGEXP = /\\\*/g;

api.common.arrayRegExp = (
  items // array of strings with '*' wildcards to be converted into one RegExp
  // Example: ['/css/*', '/index.html']
) => {
  if (!items || items.length === 0) return null;
  items = items.map(item => (
    api.common.escapeRegExp(item).replace(ITEM_ESCAPE_REGEXP, '.*')
  ));
  const ex = '^' + (
    items.length === 1 ? items[0] : '((' + items.join(')|(') + '))'
  ) + '$';
  return new RegExp(ex);
};

api.common.sortCompareConfig = (
  s1, s2 // config files names to sort in required order
  // Example: files.sort(api.common.sortCompareConfig);
) => {
  let a = impress.CONFIG_FILES_PRIORITY.indexOf(s1);
  let b = impress.CONFIG_FILES_PRIORITY.indexOf(s2);
  if (a === -1) a = Infinity;
  if (b === -1) b = Infinity;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

api.common.sortCompareDirectories = (
  a, b // strings to compare
  // Example: files.sort(api.common.sortCompareDirectories);
) => {
  let s1 = a.name, s2 = b.name;
  if (s1.charAt(0) !== '/') s1 = '0' + s1;
  if (s2.charAt(0) !== '/') s2 = '0' + s2;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

api.common.sortCompareByName = (
  a, b // objects to compare
  // Example: files.sort(api.common.sortCompareByName);
) => {
  const s1 = a.name;
  const s2 = b.name;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

api.common.clearCacheStartingWith = (
  cache, // Map instance to clear
  startsWith, // string to compare with key start
  fn // function(key, val) to be called on each key (optional)
) => {
  let key, val;
  for ([key, val] of cache) {
    if (key.startsWith(startsWith)) {
      cache.delete(key);
      if (fn) fn(key, val);
    }
  }
};

api.common.logApiMethod = (
  fnPath // path to function to be wrapped
  // Example: api.common.logApiMethod('fs.stats')
) => {
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
      const fPar = logArgs.substring(1, logArgs.length - 1);
      const fMsg = fnPath + '(' + fPar + ', callback)';
      impress.log.debug(fMsg);
      const stack = new Error().stack.toString().split('\n');
      impress.log.debug(stack[2].trim());
    }
    if (callback) {
      args.push(() => {
        const args = [];
        Array.prototype.push.apply(args, args);
        const logArgs = api.json.stringify(args);
        if (impress && impress.log) {
          const cbPar = logArgs.substring(1, logArgs.length - 1);
          const cbMsg = fnPath + ' callback(' + cbPar + ')';
          impress.log.debug(cbMsg);
        }
        callback(...args);
      });
    }
    return originalMethod(...args);
  });
};

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

api.common.pathSeparator = process.isWin ? '\\' : '/';

api.common.cache = (
  // Extend Map interface total allocated size: map.allocated
) => {
  const cache = new Map();
  cache.allocated = 0;

  cache.add = (key, val) => {
    if (cache.has(key)) {
      const prev = cache.get(key);
      cache.allocated -= api.common.cacheSize(prev);
    }
    cache.allocated += api.common.cacheSize(val);
    cache.set(key, val);
  };

  cache.del = (key) => {
    if (cache.has(key)) {
      const val = cache.get(key);
      cache.allocated -= api.common.cacheSize(val);
    }
  };

  cache.clearStartingWith = (
    startsWith // string to compare with key start
  ) => {
    let key, val;
    for ([key, val] of cache) {
      if (key.startsWith(startsWith)) {
        cache.allocated -= api.common.cacheSize(val);
        cache.delete(key);
      }
    }
  };

  return cache;
};

api.common.cacheSize = (data) => (data || data.lenght ? data.length : 0);
