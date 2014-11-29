'use strict';

// Get local IPs
//
impress.localIPs = [];
var ifName,
    interfaces = api.os.networkInterfaces();
for (ifName in interfaces) {
  interfaces[ifName].forEach(function(protocol) {
    if (protocol.family === 'IPv4') impress.localIPs.push(protocol.address);
  });
}

// Generate SID
//
impress.generateSID = function(config) {
  var key = generateKey(
    config.sessions.length - 4,
    config.sessions.characters
  );
  return key + impress.crcSID(config, key);
};

// Calculate SID CRC
//
impress.crcSID = function(config, key) {
  var md5 = api.crypto.createHash('md5');
  return md5.update(key + config.secret).digest('hex').substring(0, 4);
};

// Validate SID
//
impress.validateSID = function(config, sid) {
  if (!sid) return false;
  var crc = sid.substr(sid.length - 4),
      key = sid.substr(0, sid.length - 4);
  return impress.crcSID(config, key) === crc;
};

// Substitute variables with values
//   tpl        - template body
//   data       - global data structure to visualize
//   dataPath   - current position in data structure
//   escapeHtml - escape html special characters if true
//   returns string
//
impress.subst = function(tpl, data, dataPath, escapeHtml) {
  tpl = tpl.replace(/@([\-\.0-9a-zA-Z]+)@/g, function(s, key) {
    var name, pos = key.indexOf('.');
    if (pos === 0) name = dataPath + key; else name = key;
    var value = impress.getByPath(data, name);
    if (typeof(value) === 'undefined') {
      if (key === '.value') value = impress.getByPath(data, dataPath);
      else value = '[undefined]';
    }
    if (value === null) value = '[null]';
    else if (typeof(value) === 'undefined') value = '[undefined]';
    else if (typeof(value) === 'object') {
      if (value.constructor.name === 'Date') value = value.toSimpleString();
      else if (value.constructor.name === 'Array') value = '[array]';
      else value = '[object]';
    }
    if (escapeHtml) value = impress.htmlEscape(value);
    return value;
  });
  return tpl;
};

// Return value from data structure
//
impress.getByPath = function(data, dataPath) {
  dataPath = dataPath.split('.');
  var i, next, obj = data;
  for (i = 0; i < dataPath.length; i++) {
    next = obj[dataPath[i]];
    if (typeof(next) === 'undefined' || next === null) return next;
    obj = next;
  }
  return obj;
};

// Set value in data structure by path
//
impress.setByPath = function(data, dataPath, value) {
  dataPath = dataPath.split('.');
  var i, next, obj = data;
  for (i = 0; i < dataPath.length; i++) {
    next = obj[dataPath[i]];
    if (i === dataPath.length - 1) {
      obj[dataPath[i]] = value;
      return true;
    } else {
      if (typeof(next) === 'undefined' || next === null) return false;
      obj = next;
    }
  }
  return false;
};

// Delete data from data structure by path
//
impress.deleteByPath = function(data, dataPath) {
  dataPath = dataPath.split('.');
  var i, next, obj = data;
  for (i = 0; i < dataPath.length; i++) {
    next = obj[dataPath[i]];
    if (i === dataPath.length - 1) {
      if (obj.hasOwnProperty(dataPath[i])) {
        delete obj[dataPath[i]];
        return true;
      }
    } else {
      if (typeof(next) === 'undefined' || next === null) return false;
      obj = next;
    }
  }
  return false;
};

// Escape string to protect characters from interpreting as html special characters
//   Example: impress.htmlEscape('5>=5') : '5&lt;=5'
//
impress.htmlEscape = function(content) {
  return (content.replace(/[&<>"'\/]/g, function(char) {
    return ({ '&':'&amp;','<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]);
  }));
};

// Extract file extension in lower case with no dot
//   Example: impress.fileExt('/dir/file.txt') : 'txt'
//
impress.fileExt = function(fileName) {
  return api.path.extname(fileName).replace('.','').toLowerCase();
};

// Compare time1 and time2 in milliseconds
//
impress.isTimeEqual = function(time1, time2) {
  return (new Date(time2)).getTime() === (new Date(time1)).getTime();
};

// Extract host name from string where port may be defined 'host:port'
// and return string constant if host is empty string
//
impress.parseHost = function(host) {
  if (!host) host = 'no-host-name-in-http-headers';
  var portOffset = host.indexOf(':');
  if (portOffset >= 0) host = host.substr(0, portOffset);
  return host;
};

// Remove UTF-8 BOM
//
impress.removeBOM = function(s) {
  if (typeof(s) === 'string') return s.replace(/^[\uBBBF\uFEFF]/, '');
  else return s;
};

// Convert array of strings with '*' wildcards e.g. ['/css/*', '/index.html'] into one RegExp
//
impress.arrayRegExp = function(items) {
  if (items && items.length) {
    items = items.map(function(item) {
      item = escapeRegExp(item);
      return item.replace(/\\\*/g,'.*');
    });
    var ex;
    if (items.length === 1) ex = '^' + items[0] + '$';
    else ex = '^((' + items.join(')|(') + '))$';
    return new RegExp(ex);
  } else return null;
};

// Current date and time in format: YYYY-MM-DD
//
impress.nowDate = function(now) {
  if (!now) now = new Date();
  var yyyy = now.getUTCFullYear(),
      mm = (now.getUTCMonth() + 1).toString(),
      dd = now.getUTCDate().toString();
  return yyyy + '-' + (mm[1] ? mm : '0' + mm[0]) + '-' + (dd[1] ? dd : '0' + dd[0]);
};

// Compare function for sorting config files
//
impress.sortCompareConfig = function(s1, s2) {
  var a = impress.CONFIG_FILES_PRIORITY.indexOf(s1),
      b = impress.CONFIG_FILES_PRIORITY.indexOf(s2);
  if (a === -1) a = Infinity;
  if (b === -1) b = Infinity;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

// Compare function for sorting files and directories
// Directories goes first
//
impress.sortCompareDirectories = function(a, b) {
  var s1 = a.name, s2 = b.name;
  if (s1.charAt(0) !== '/') s1 = '0' + s1;
  if (s2.charAt(0) !== '/') s2 = '0' + s2;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};

// Simple compare strings for sort
//
impress.sortCompareByName = function(a, b) {
  var s1 = a.name, s2 = b.name;
  if (s1 < s2) return -1;
  if (s1 > s2) return 1;
  return 0;
};
