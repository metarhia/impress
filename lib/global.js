"use strict";

var initContext = function(context) {

	if (typeof(window) != 'undefined') context.global = window;

	context.isBrowser = typeof(exports) === 'undefined';
	context.isServer = !isBrowser;

	context.falseness = function() { return false; };

	// *** Object utils ***

	// Override method and save previous implementation to .inherited
	//
	Function.prototype.override = function(fn) {
		var superFunction = this;
		return function() {
			this.inherited = superFunction;
			return fn.apply(this, arguments);
		};
	};

	// Extend obj with properties of ext
    //
	context.extend = function(obj, ext) {
		if (typeof(obj) == 'undefined') obj = null;
		for (var property in ext) obj[property] = ext[property];
		return obj;
	};

	// Clone object and extend it of ext specified
    //
	context.clone = function(obj, ext) {
		if (obj === null || typeof(obj) != "object") return obj;
		var copy = obj.constructor();
		for (var i in obj) {
			if (obj[i] && typeof(obj[i]) == "object") copy[i] = global.clone(obj[i]);
			else copy[i] = obj[i];
		}
		if (ext !== null && typeof(ext) == 'object') {
			for (var i in ext) {
				if (ext[i] && typeof(ext[i]) == "object") copy[i] = global.clone(ext[i]);
				else copy[i] = ext[i];
			}
		}
		return copy;
	};
    
	// *** Array utils ***

	// Check is value is an Array
	//
	if (!Array.isArray) {
		console.log('no isArray');
		Array.prototype.isArray = function (value) {
			return Object.prototype.toString.call(value) === '[object Array]';
		}
	}

	// Delete array element
	//   returns number of deleted elements
    //
	context.arrayDelete = function(array, element) {
		if (!array || !Array.isArray(array)) return 0;
		var counter = 0;
		for (var i = 0; i < array.length; i++) {
			if (array[i] == element) {
				array.splice(i, 1);
				counter++;
			}
		}
		return counter;
	};
	
	// Define indexOf, if not implemented (IE<=8)
	//
	if (!Array.prototype.indexOf) {
		console.log('no indexOf');
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
		Array.prototype.lastIndexOf = function(searchElement, fromIndex) {
			fromIndex = fromIndex || this.length-1;
			if (fromIndex>0) {
				for (var i = fromIndex; i >= 0; i--) {
					if (this[i] === searchElement) return i;
				}
			}
			return -1;
		};
	}
    
	// Define inArray, if not implemented
	//
	context.inArray = function(array, value) {
		return array.indexOf(value) != -1;
	};
	
	// Convert array of strings with "*" wildcards e.g. ['/css/*', '/index.html'] into one RegExp
	//
	context.arrayRegExp = function(items) {
		if (items && items.length) {
			items = items.map(function(item) {
				item = escapeRegExp(item);
				return item.replace(/\\\*/g,".*");
			});
			var ex;
			if (items.length == 1) ex = '^'+items[0]+'$';
			else ex = '^(('+items.join(")|(")+'))$';
			//console.log(ex+' = '+(new RegExp(ex)).toString());
			return new RegExp(ex);
		} else return null;
    };
	
	// *** String utils ***
	
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
	
	String.prototype.ltrim = function() {
		return this.replace(/^\s+/,'');
	};
    
	String.prototype.rtrim = function() {
		return this.replace(/\s+$/,'');
    };
	
    String.prototype.capitalize = function() {
		return this.replace(/\w+/g, function(word) {
			return word.charAt(0).toUpperCase()+word.substr(1).toLowerCase();
		});
    };

    String.prototype.contains = function(s) {
		return this.indexOf(s) > -1;
	};

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
	};

	String.prototype.rpad = function(padChar, length) {
		var padCount = length - this.length;
		if (padCount<0) padCount = 0;
		return this+Array(padCount).join(padChar);
	};

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
    };

    // Add toISOString support if no native support
	// Example: "2012-01-01T12:30:15.120Z"
    //
	if (!Date.prototype.toISOString) {
		Date.prototype.toISOString = function() {
			function pad(n) { return n < 10 ? '0' + n : n; }
			return (
				this.getUTCFullYear()+'-'+
				pad(this.getUTCMonth()+1)+'-'+
				pad(this.getUTCDate())+'T'+
				pad(this.getUTCHours())+':'+
				pad(this.getUTCMinutes())+':'+
				pad(this.getUTCSeconds())+'Z'
			);
		};
	}

	// toSimpleString return date string in local timezone
    // Example: "2012-01-01 12:30"
	// 
    Date.prototype.toSimpleString = function() {
		function pad(n) { return n < 10 ? '0' + n : n; }
		if (isNaN(this.getTime())) return "";
		else return (
			this.getFullYear()+'-'+
			pad(this.getMonth()+1)+'-'+
			pad(this.getDate())+' '+
			pad(this.getHours())+':'+
			pad(this.getMinutes())
		);
	};

    // Parse duration to seconds
	// Example: duration("1d 10h 7m 13s")
    //
	context.duration = function(s) {
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
	};

	// Generate random key with specified length from string of possible characters
	//
	context.generateKey = function(length, possible) {
		var key = "";
		for (var i=0; i<length; i++) key += possible.charAt(random(0,possible.length-1));
		return key;
    };

    // Generate GUID/UUID RFC4122 compliant
	//
    context.generateGUID = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	};

	// IP Address from string e.g. "10.18.8.1" to signed integer
	//
	context.ip2int = function(ip) {
		if (!ip) ip = '127.0.0.1';
		return ip.split('.').reduce(function(res, item) {
			return (res << 8)+ +item;
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
		context.escapeRegExp = function(str) {
			return str.replace(regex, "\\$&");
		};
	}());

	// Add single slash to the right with no duplicates
    //
	context.lastSlash = function(path) {
		return path+(path.slice(-1) == '/' ? '' : '/');
    };

    // Return true for scalar vars and false for arrays and objects
	//
    context.isScalar = function(variable) {
		return (/boolean|number|string/).test(typeof(variable));
    };

	// Return random number less then one argument random(100) or between two argumants random(50,150)
	//
	context.random = function(min, max) {
		if (arguments.length == 1) { max = min; min = 0; }
		return min+Math.floor(Math.random()*(max-min+1));
	};

	// Shuffle array
	//
    context.shuffle = function(arr) {
		var j, x;
		for (var i = arr.length; i; j = Math.floor(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
		return arr;
	};

	// Size in bytes to Kb, Mb, Gb and Tb
	//
	context.bytesToSize = function(bytes) {
		var sizes = ['', ' Kb', ' Mb', ' Gb', ' Tb'];
		if (bytes === 0) return '0';
		var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		return Math.round(bytes / Math.pow(1024, i), 2)+sizes[i];
	};

};

if (typeof(window) == 'undefined') module.exports = initContext;
else initContext(window);