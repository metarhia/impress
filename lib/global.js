if (typeof(window) != 'undefined') window.global = window;

global.isBrowser = typeof(exports) === 'undefined';
global.isServer = !isBrowser;

if (global.isBrowser && window) window.global = window;

global.falseness = function() { return false; }

// *** Object utils ***

// Override method and save previous implementation to .inherited
//
Function.prototype.override = function(fn) {
	var superFunction = this;
	return function() {
		this.inherited = superFunction;
		return fn.apply(this, arguments);
	}
}

// Extend obj with properties of ext
//
global.extend = function(obj, ext) {
	for (var property in ext) obj[property] = ext[property];
	return obj;
}

// Clone object and extend it of ext specified
//
global.clone = function(obj, ext) {
	if (obj == null || typeof(obj) != "object") return obj;
	var copy = obj.constructor();
	for (var i in obj) {
		if (obj[i] && typeof(obj[i]) == "object") copy[i] = global.clone(obj[i]);
		else copy[i] = obj[i];
	}
	if (ext != null && typeof(ext) == 'object') {
		for (var i in ext) {
			if (ext[i] && typeof(ext[i]) == "object") copy[i] = global.clone(ext[i]);
			else copy[i] = ext[i];
		}
	}
	return copy;
}

// *** Array utils ***

// Delete array element
//
global.arrayDelete = function(array, element) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] == element) {
			array.splice(i, 1);
			return i;
		}
	}
}

// Define indexOf, if not implemented
//
if (!Array.prototype.indexOf) {
	console.log('!Array.prototype.indexOf');
	console.dir(!Array.prototype.indexOf);

	Array.prototype.indexOf = function (searchElement, fromIndex) {
		fromIndex = fromIndex || 0;
		for (var i = fromIndex; i < this.length; i++) {
			if (this[i] === searchElement) return i;
		}
		return -1;
	};
}

// Define lastIndexOf, if not implemented
//
if (!Array.prototype.lastIndexOf) {
	console.log('!Array.prototype.lastIndexOf');
	console.dir(!Array.prototype.lastIndexOf);

	Array.prototype.lastIndexOf = function(searchElement, fromIndex) {
		fromIndex = fromIndex || this.length-1;
		if (fromIndex>0) {
			for (var i = fromIndex; i >= 0; i--) {
				console.log('lastIndexOf::'+i);
				console.dir(this[i]);
				if (this[i] === searchElement) return i;
			}
		}
		return -1;
	};
}

// Define inArray, if not implemented
//
global.inArray = function(array, value) {
	return array.indexOf(value) != -1;
};

// Convert array of strings with "*" wildcards e.g. ['/css/*', '/index.html'] into one RegExp
//
global.arrayRegExp = function(items) {
	if (items && items.length) {
		items = items.map(function(item) {
			item = escapeRegExp(item);
			return item.replace(/\\\*/g,".*");
		});
		var ex;
		if (items.length == 1) ex = '^'+items[0]+'$';
		else ex = '^(('+items.join(")|(")+'))$';
		return new RegExp(ex);
	} else return null;
}

// *** String utils ***

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g, '');
}

String.prototype.ltrim = function() {
	return this.replace(/^\s+/,'');
}

String.prototype.rtrim = function() {
	return this.replace(/\s+$/,'');
}

String.prototype.capitalize = function() {
	return this.replace(/\w+/g, function(word) {
		return word.charAt(0).toUpperCase()+word.substr(1).toLowerCase();
	});
}

if (typeof(String.prototype.startsWith) != 'function') {
	String.prototype.startsWith = function(s) {
		return this.slice(0, s.length) == s;
	};
}

if (typeof(String.prototype.endsWith) != 'function') {
	String.prototype.endsWith = function(s){
		return this.slice(-s.length) == s;
	};
}

String.prototype.lpad = function(padChar, length) {
	var padCount = length - this.length;
	if (padCount<0) padCount = 0;
	return Array(padCount).join(padChar)+this;
}

String.prototype.rpad = function(padChar, length) {
	var padCount = length - this.length;
	if (padCount<0) padCount = 0;
	return this+Array(padCount).join(padChar);
}

String.prototype.between = function(prefix, suffix) {
	var s = this,
		i = s.indexOf(prefix);
	if (i >= 0) s = s.substring(i + prefix.length);
	else return '';
	if (suffix) {
		i = s.indexOf(suffix);
		if (i >= 0) s = s.substring(0, i);
		else return '';
	}
	return s;
}

// Add toISOString support if no native support
// Example: "2012-01-01T12:30:15.120Z"
//
if (!Date.prototype.toISOString) {
	Date.prototype.toISOString = function() {
		function pad(n) { return n < 10 ? '0' + n : n }
		return this.getUTCFullYear()+'-'
			+ pad(this.getUTCMonth()+1)+'-'
			+ pad(this.getUTCDate())+'T'
			+ pad(this.getUTCHours())+':'
			+ pad(this.getUTCMinutes())+':'
			+ pad(this.getUTCSeconds())+'Z';
	}
}

// toSimpleString return date string in local timezone
// Example: "2012-01-01 12:30"
// 
Date.prototype.toSimpleString = function() {
	function pad(n) { return n < 10 ? '0' + n : n }
	if (isNaN(this.getTime())) return "";
	else return this.getFullYear()+'-'
		+ pad(this.getMonth()+1)+'-'
		+ pad(this.getDate())+' '
		+ pad(this.getHours())+':'
		+ pad(this.getMinutes());
}

// Parse duration to seconds
// Example: duration("1d 10h 7m 13s")
//
global.duration = function(s) {
	var result = 0;
	if (typeof(s) == 'string') {
		var days    = s.match(/(\d+)\s*d/),
			hours   = s.match(/(\d+)\s*h/),
			minutes = s.match(/(\d+)\s*m/),
			seconds = s.match(/(\d+)\s*s/);
		if (days)    result += parseInt(days[1])*86400;
		if (hours)   result += parseInt(hours[1])*3600;
		if (minutes) result += parseInt(minutes[1])*60;
		if (seconds) result += parseInt(seconds[1]);
		result = result*1000;
	} if (typeof(s) == 'number') result = s;
	return result;
}

// Generate random key with specified length from string of possible characters
//
global.generateKey = function(length, possible) {
	var key = "";
	for (var i=0; i<length; i++) key += possible.charAt(random(0,possible.length-1));
	return key;
}

// Generate GUID/UUID RFC4122 compliant
//
global.generateGUID = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
}

// IP Address from string e.g. "10.18.8.1" to signed integer
//
global.ip2int = function(ip) {
	return ip.split('.').reduce(function(res, item) {
		return (res << 8)+ +item
	}, 0);
};

// Escape RegExp string
// Example: escapeRegExp("/path/to/res?search=this.that")
//
(function() {

	var specials = [
			// order matters for these
			"-", "[", "]",
			// order doesn`t matter for any of these
			"/", "{", "}", "(", ")", "*", "+", "?", ".", "\\", "^", "$", "|"
		],
		regex = new RegExp('['+specials.join('\\')+']', 'g');

	global.escapeRegExp = function(str) {
		return str.replace(regex, "\\$&");
	};

}());

// Add single slash to the right with no duplicates
//
global.lastSlash = function(path) {
	return path+(path.slice(-1) == '/' ? '' : '/');
}

// Return true for scalar vars and false for arrays and objects
//
global.isScalar = function(variable) {
	return (/boolean|number|string/).test(typeof(variable));
}

// Return random number less then one argument random(100) or between two argumants random(50,150)
//
global.random = function() {
	if (arguments.length == 1) var min = 0, max = arguments[0];
	else var min = arguments[0], max = arguments[1];
	return min+Math.floor(Math.random()*(max-min+1));
}

// Shuffle array
//
global.shuffle = function(arr) {
	var rnd, result = [];
	for (var i = 0; i < arr.length; ++i) {
		rnd = random(i);
		result[i-1] = result[rnd];
		result[rnd] = item;
	}
	return result;
}