"use strict";

// Generate SID
//
impress.generateSID = function(config) {
	var key = generateKey(
		config.sessions.length-4,
		config.sessions.characters
	);
	return key+impress.crcSID(config, key);
};

// Calculate SID CRC
//
impress.crcSID = function(config, key) {
	var md5 = api.crypto.createHash('md5');
	return md5.update(key+config.secret).digest('hex').substring(0,4);
};

// Validate SID
//
impress.validateSID = function(config, sid) {
	if (!sid) return false;
	var crc = sid.substr(sid.length-4),
		key = sid.substr(0, sid.length-4);
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
		var name, pos = key.indexOf(".");
		if (pos === 0) name = dataPath+key; else name = key;
		var value = impress.dataByPath(data, name);
		if (typeof(value) === 'object') value = '[not found: '+key+']';
		if (escapeHtml) value = impress.htmlEscape(value);
		return value;
	});
	return tpl;
};

// Return value from data structure
//
impress.dataByPath = function(data, dataPath) {
	dataPath = dataPath.split(".");
	var obj = data;
	for (var i = 0; i < dataPath.length; i++) obj = obj[dataPath[i]] || obj;
	return obj;
};

// Escape string to protect characters from interpreting as html special characters
//   Example: impress.htmlEscape("5>=5") : "5&lt;=5"
//
impress.htmlEscape = function(content) {
	return (content.replace(/[&<>"'\/]/g, function(char) {
		return ({ "&":"&amp;","<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]);
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

// Extract host name from string where port may be defined "host:port"
// and return string constant if host is empty string
//
impress.parseHost = function(host) {
	if (!host) host = 'no-host-name-in-http-headers';
	var portOffset = host.indexOf(':');
	if (portOffset >= 0) host = host.substr(0, portOffset);
	return host;
};