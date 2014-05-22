(function(impress) {

	// Generate SID
	//
	impress.generateSID = function(config) {
		var key = generateKey(
			config.sessions.length-2,
			config.sessions.characters
		);
		return key+impress.crcSID(config, key);
	}

	// Calculate SID CRC
	//
	impress.crcSID = function(config, key) {
		var c1 = key.indexOf(key.charAt(key.length-1)),
			c2 = key.indexOf(key.charAt(key.length-2)),
			s1 = config.sessions.characters.charAt(c1),
			s2 = config.sessions.characters.charAt(c2);
		return s1+s2;
	}

	// Validate SID
	//
	impress.validateSID = function(config, sid) {
		if (!sid) return false;
		var crc = sid.substr(sid.length-2),
			key = sid.substr(0, sid.length-2);
		return impress.crcSID(config, key) == crc;
	}

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
			if (pos == 0) name = dataPath+key; else name = key;
			var value = impress.dataByPath(data, name);
			if (typeof(value) == 'object') value = '[not found: '+key+']';
			if (escapeHtml) value = impress.htmlEscape(value);
			return value;
		});
		return tpl;
	}

	// Return value from data structure
	//
	impress.dataByPath = function(data, dataPath) {
		dataPath = dataPath.split(".");
		var obj = data;
		for (var i = 0; i < dataPath.length; ++i) obj = obj[dataPath[i]] || obj;
		return obj;
	}

	// Escape string to protect characters from interpreting as html special characters
	//   Example: impress.htmlEscape("5>=5") : "5&lt;=5"
	//
	impress.htmlEscape = function(content) {
		return content.replace(/[&<>"'\/]/g, function(char) { return (
			{ "&":"&amp;","<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]
		)});
	}

	// Extract file extension in lower case with no dot
	//   Example: impress.fileExt('/dir/file.txt') : 'txt'
	//
	impress.fileExt = function(fileName) {
		return impress.path.extname(fileName).replace('.','').toLowerCase();
	}

	// Compate time1 and time2 in milliseconds
	//
	impress.isTimeEqual = function(time1, time2) {
		return (new Date(time2)).getTime() == (new Date(time1)).getTime();
	}

} (global.impress = global.impress || {}));