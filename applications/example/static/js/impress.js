'use strict';

window.global = window;

// JavaScript base classes extension if features not implemented ----------------------------------

// Define indexOf, if not implemented (IE<=8)
//
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement, fromIndex) {
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
    fromIndex = fromIndex || this.length - 1;
    if (fromIndex > 0) {
      for (var i = fromIndex; i >= 0; i--) {
        if (this[i] === searchElement) return i;
      }
    }
    return -1;
  };
}

// Add toISOString support if no native support
//   Example: '2012-01-01T12:30:15.120Z'
//
if (!Date.prototype.toISOString) {
  Date.prototype.toISOString = function() {
    function pad(n) { return n < 10 ? '0' + n : n; }
    return (
      this.getUTCFullYear() + '-' +
      pad(this.getUTCMonth() + 1) + '-' +
      pad(this.getUTCDate()) + 'T' +
      pad(this.getUTCHours()) + ':' +
      pad(this.getUTCMinutes()) + ':' +
      pad(this.getUTCSeconds()) + 'Z'
    );
  };
}

// toSimpleString return date string in local timezone
//   Example: '2012-01-01 12:30'
// 
Date.prototype.toSimpleString = function() {
  function pad(n) { return n < 10 ? '0' + n : n; }
  if (isNaN(this.getTime())) return '';
  else return (
    this.getUTCFullYear() + '-' +
    pad(this.getUTCMonth() + 1) + '-' +
    pad(this.getUTCDate()) + ' ' +
    pad(this.getUTCHours()) + ':' +
    pad(this.getUTCMinutes())
  );
};

if (!Date.prototype.now) {
  Date.prototype.now = function() {
    return new Date().getTime();
  };
}

// Impress API ------------------------------------------------------------------------------------
/**
 * @name impress
 * @namespace client.impress
 */
(function(impress) {

  impress.falseness = function() { return false; };
  impress.trueness = function() { return true; };
  impress.emptyness = function() { };

  // Generate SID
  //
  impress.generateSID = function(config) {
    var key = impress.generateKey(
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
        if (value.constructor.name === 'Date') value = impress.nowDateTime(value);
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
    var next, obj = data;
    for (var i = 0; i < dataPath.length; i++) {
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
    var next, obj = data;
    for (var i = 0; i < dataPath.length; i++) {
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
    var next, obj = data;
    for (var i = 0; i < dataPath.length; i++) {
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
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]);
    }));
  };

  // Convert number to string, padding '0' char if single char
  //
  impress.pad2 = function(n) {
    return n < 10 ? '0' + n : '' + n;
  };

  // Current date and time in format: YYYY-MM-DD
  //   now - date object, optional
  //
  impress.nowDate = function(now) {
    if (!now) now = new Date();
    return (
      now.getUTCFullYear() + '-' +
      impress.pad2(now.getUTCMonth() + 1) + '-' +
      impress.pad2(now.getUTCDate())
    );
  };

  // nowDateTime return date string in local timezone
  //   Example: '2012-01-01 12:30'
  //   now - date object, optional
  //
  impress.nowDateTime = function(now) {
    if (!now) now = new Date();
    return (
      now.getUTCFullYear() + '-' +
      impress.pad2(now.getUTCMonth() + 1) + '-' +
      impress.pad2(now.getUTCDate()) + ' ' +
      impress.pad2(now.getUTCHours()) + ':' +
      impress.pad2(now.getUTCMinutes())
    );
  };

  // Generate random key with specified length from string of possible characters
  //
  impress.generateKey = function(length, possible) {
    var key = '';
    for (var i = 0; i < length; i++) key += possible.charAt(impress.random(0, possible.length - 1));
    return key;
  };

  // Generate GUID/UUID RFC4122 compliant
  //
  impress.generateGUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };

  // Return random number less then one argument random(100) or between two argumants random(50,150)
  //
  impress.random = function(min, max) {
    if (arguments.length === 1) { max = min; min = 0; }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // Shuffle array
  //
  impress.shuffle = function(arr) {
    var i, j, x;
    for (i = arr.length; i; j = Math.floor(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
    return arr;
  };

  // Extend obj with properties of ext
  //
  impress.extend = function(obj, ext) {
    if (typeof(obj) === 'undefined') obj = null;
    for (var property in ext) obj[property] = ext[property];
    return obj;
  };

  // Clone object and extend it of ext specified
  //
  impress.clone = function(obj, ext) {
    if (obj === null || typeof(obj) !== 'object') return obj;
    var copy = obj.constructor();
    for (var i in obj) {
      if (obj[i] && typeof(obj[i]) === 'object') copy[i] = impress.clone(obj[i]);
      else copy[i] = obj[i];
    }
    if (ext !== null && typeof(ext) === 'object') {
      for (var j in ext) {
        if (ext[j] && typeof(ext[j]) === 'object') copy[j] = impress.clone(ext[j]);
        else copy[j] = ext[j];
      }
    }
    return copy;
  };

  // Trim non-whitespace chars
  //
  impress.trim = function(s) {
    return s.replace(/^\s+|\s+$/g, '');
  };

  // Trim left non-whitespace chars
  //
  impress.ltrim = function(s) {
    return s.replace(/^\s+/,'');
  };

  // Trim right non-whitespace chars
  //
  impress.rtrim = function(s) {
    return s.replace(/\s+$/,'');
  };

  // Capitalize string chars (first char of each word is upper, other chars is lower)
  //
  impress.capitalize = function(s) {
    return s.replace(/\w+/g, function(word) {
      return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
  };

  // Pad string left with given padChar to required length
  //
  impress.lpad = function(s, padChar, length) {
    var padCount = length - s.length + 1;
    if (padCount < 0) padCount = 0;
    return new Array(padCount).join(padChar) + s;
  };

  // Pad string right with given padChar to required length
  //
  impress.rpad = function(s, padChar, length) {
    var padCount = length - s.length + 1;
    if (padCount < 0) padCount = 0;
    return s + new Array(padCount).join(padChar);
  };

  // Get substring from string s between prefix and suffix
  //
  impress.between = function(s, prefix, suffix) {
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

  // Return true for scalar vars and false for arrays and objects
  //
  impress.isScalar = function(variable) {
    return (/boolean|number|string/).test(typeof(variable));
  };

  // Define inArray, if not implemented
  //
  impress.inArray = function(array, value) {
    return array ? array.indexOf(value) !== -1 : false;
  };

  // Merge arrays into first one
  //
  impress.merge = function(/* arrays to merge */) {
    var arr, array = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      arr = arguments[i];
      for (var j = 0; j < arr.length; j++) {
        if (array.indexOf(arr[j]) === -1) array.push(arr[j]);
      }
    }
    return array;
  };

  // Override/inherited
  //
  impress.override = function(obj, fn) {
    fn.inherited = obj[fn.name];
    obj[fn.name] = fn;
  };

  // Is string starts with given substring
  //
  impress.startsWith = function(str, substring) {
    return str.indexOf(substring) === 0;
  };

  // Is string ends with given substring
  //
  impress.endsWith = function(str, substring) {
    if (substring === '') return true;
    return str.slice(-substring.length) === substring;
  };

  // Is string contains given substring
  //
  impress.contains = function(str, substring) {
    return str.indexOf(substring) > -1;
  };

  // DOM utilities

  impress.html = document.documentElement || document.getElementsByTagName('html')[0];
  impress.head = document.head || document.getElementsByTagName('head')[0];
  impress.body = null;
  impress.form = null;

  // Async script loader

  impress.scripts = {};

  impress.require = function(scripts, callback) {
    var counter = 0,
      scriptLoaded = function() {
        counter++;
        this.script.loaded = true;
        impress.scripts[script.namespace] = this.script;
        if (counter === scripts.length && callback) callback();
      },
      scriptError = function() {
        counter++;
        delete this.script;
        impress.head.removeChild(this);
        if (counter === scripts.length && callback) callback();
      };
    for (var i = 0; i < scripts.length; ++i) {
      var path = scripts[i],
          file = path.replace(/^.*[\\\/]/, ''),
          namespace = file.replace(/\.[^/.]+$/, '');
      if (!impress.scripts[namespace]) {
        var script = { namespace: namespace, file: file, url: path, element: null, loaded: false };
        script.element = document.createElement('script');
        script.element.script = script;
        impress.addEvent(script.element, 'load', scriptLoaded);
        impress.addEvent(script.element, 'error', scriptError);
        script.element.src = path;
        impress.head.appendChild(script.element);
      }
    }
  };

  impress.free = function(scripts, callback) {
    for (var i = 0; i < scripts.length; ++i) {
      var namespace = scripts[i],
          script = impress.scripts[namespace];
      if (script) {
        impress.head.removeChild(script.element);
        if (impress[namespace]) delete impress[namespace];
        delete impress.scripts[namespace];
      }
    }
    if (callback) callback();
  };

  // Other utils

  impress.preloadImages = function(images, callback) {
    var counter = 0;
    function fnEvent() {
      counter++;
      if (counter === images.length) callback();
    }
    for (var i = 0; i < images.length; i++) {
      var img = document.createElement('img');
      impress.addEvent(img, 'load', fnEvent);
      impress.addEvent(img, 'error', fnEvent);
      img.src = images[i];
    }
  };

  //if (typeof(JSON) !== 'object') require(['json2.js']);//no such lib, probably should be removed

  // Platform detection

  impress.platform = {
    iPhone: navigator.userAgent.match(/iPhone/i),
    iPod: navigator.userAgent.match(/iPod/i),
    iPad: navigator.userAgent.match(/iPad/i),
    Android: navigator.userAgent.match(/Android/i),
    IE: navigator.appName.indexOf('Microsoft') !== -1,
    IEMobile: navigator.userAgent.match(/IEMobile/i),
    Chrome: !!window.chrome, // navigator.userAgent.match(/Chrome/i),
    Safari: navigator.userAgent.match(/Safari/i) && !window.chrome,
    FireFox: navigator.userAgent.indexOf('Firefox') > -1,
    BlackBerry: navigator.userAgent.match(/BlackBerry/i),
    WebOS: navigator.userAgent.match(/webOS/i),
    Opera: window.opera, // navigator.userAgent.indexOf('Presto') > -1
    OperaMini: navigator.userAgent.match(/Opera Mini/i),
    OperaMobi: navigator.userAgent.match(/Opera Mobi/i)
  };

  var platform = impress.platform;

  platform.iOS = platform.iPhone || platform.iPod || platform.iPad;
  platform.Mobile = platform.iOS || platform.Android || platform.OperaMini || platform.OperaMobi || platform.BlackBerry || platform.WebOS;
  platform.WebKit = platform.Chrome || platform.Safari;

  if (platform.IE) platform.IEVersion = parseFloat(navigator.appVersion.split('MSIE')[1]);

  impress.fixLinks = function(persist) {
    if (platform.iOS) {
      if (persist === null) persist = true;
      persist = persist && localStorage;
      if (persist) {
        var currentLocation = window.location.pathname + window.location.search,
            storedLocation = localStorage.getItem('location');
        if (storedLocation && storedLocation !== currentLocation) window.location = storedLocation;
      }
      var link, links = document.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) {
        link = links[i];
        link.addEventListener('click', function(e) {
          //e.preventDefault();
          if (persist && this.host === window.location.host) localStorage.setItem('location', this.pathname + this.search);
          window.location = this.href;
        }, false);
      }
    }
  };

  impress.fixCookie = function(sessionCookieName) {
    if (localStorage && platform.iOS) {
      var cookieSession = document.cookie.match(new RegExp(sessionCookieName + '=[^;]+')),
          localSession = localStorage.getItem(sessionCookieName);
      if (cookieSession) {
        cookieSession = cookieSession[0].replace(sessionCookieName + '=', '');
        if (localSession !== cookieSession) localStorage.setItem(sessionCookieName, cookieSession);
      } else if (localSession && localSession !== cookieSession) {
        document.cookie = sessionCookieName + '=' + localSession + '; path=/';
        window.location.reload(true);
      }
    }
  };

  // DOM utils

  impress.id = function(id) {
    return document.getElementById(id);
  };

  if (document.getElementsByClassName) {
    impress.getElementsByClass = function(classList, context) {
      return (context || document).getElementsByClassName(classList);
    };
  } else {
    impress.getElementsByClass = function(classList, context) {
      context = context || document;
      var list = context.getElementsByTagName('*'),
        classArray = classList.split(/\s+/),
        result = [], i, j;
      for (i = 0; i < list.length; i++) {
        for(j = 0; j < classArray.length; j++) {
          if(list[i].className.search('\\b' + classArray[j] + '\\b') !== -1) {
            result.push(list[i]);
            break;
          }
        }
      }
      return result;
    };
  }

  /**
   *
   * @param {HTMLElement} element
   * @param className
   * @returns {string|*|className|jQuery.className|.toggleClass.className}
   * @memberOf impress
   */
  impress.addClass = function(element, className) {
    var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
    if (regex.test(element.className)) {
      element.className = (element.className + ' ' + className).replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
      return element.className;
    }
  };

  impress.removeClass = function(element, className) {
    var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
    element.className = element.className.replace(regex, '$1').replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
  };

  impress.hasClass = function(element, className) {
    element = impress.element(element);
    return element.className.match(new RegExp('(^|\b)' + className + '($|\b)'));
  };

  impress.toggleClass = function(element, className) {
    element = impress.element(element);
    if (impress.hasClass(element, className)) impress.removeClass(element, className);
    else impress.addClass(element, className);
  };

  impress.insertAfter = function(parent, node, referenceNode) {
    parent.insertBefore(node, referenceNode.nextSibling);
  };

  impress.getFrameDocument = function(fname) {
    if (platform.IE) return frames[fname].document;
    else return impress.id(fname).contentDocument;
  };

  /**
   * Add event listener to given element
   * @param {Window|Element} element
   * @param {string} event
   * @param {function(this:Element, Event)} fn
   * @returns {boolean}
   */
  impress.addEvent = function(element, event, fn) {
    if (element.addEventListener) {
      return element.addEventListener(event, fn, false);
    } else if (element.attachEvent) {
      var callback = function() {
        fn.call(element);
      };
      return element.attachEvent('on' + event, callback);
    } else return false;
  };

  /**
   *
   * @param {Window|Element} element
   * @param {string} event
   * @param {function} fn
   * @returns {boolean}
   */
  impress.removeEvent = function(element, event, fn) {
    if (element.removeEventListener) {
      return element.removeEventListener(event, fn, false);
    } else if (element.detachEvent) {
      return element.detachEvent('on' + event, fn);
    } else return false;
  };

  /**
   * Add event listener to given element or to Window
   * @name impress.on
   * @param {string} event 'load', 'unload', 'click', etc.
   * @param {string|HTMLElement|Window|function} [element]  Window by default
   * @param {function(this:Element, Event)} fn Evant Handler function
   */
  impress.on = function(event, element, fn) {
    if (arguments.length === 2) {
      fn = element;
      element = window;
    }
    element = impress.element(element);
    if (element) impress.addEvent(element, event, fn);
  };

  /**
   * Get element by selector from given context or from document by default
   * @name element
   * @class impress
   * @param {String|HTMLElement} element
   * @param {HTMLElement} [context]
   * @returns {HTMLElement} element
   */
  impress.element = function(element, context) {
    context = impress.isElement(context) ? context : document;
    if (typeof(element) === 'string') return context.querySelector(element);
    else return element;
  };

  /**
   * Check if object is DOM Element
   * @param obj
   * @returns {boolean}
   */
  impress.isElement = function(obj) {
    try {
      //Using W3 DOM2 (works for FF, Opera and Chrome)
      return obj instanceof HTMLElement;
    }
    catch (e) {
      //Browsers not supporting W3 DOM2 don't have HTMLElement and
      //an exception is thrown and we end up here. Testing some
      //properties that all elements have. (works on IE7)
      return (typeof obj === "object") &&
          (obj.nodeType === 1) && (typeof obj.style === "object") &&
          (typeof obj.ownerDocument === "object");
    }
  };

  impress.on('load', function() {
    impress.body = document.body || document.getElementsByTagName('body')[0];
  });

  // fn(event) should return not empty string for confirmation dialog
  impress.onBeforeUnload = function(fn) {//no usages, but may be useful
    impress.addEvent(impress, 'beforeunload', function(event) {
      var message = fn(event);
      if (typeof(event) === 'undefined') event = window.event;
      if (event) event.returnValue = message;
      return message;
    });
  };

  // --------------------------------------------------------------
  //no usages, but maybe'll be needed
  impress.enable = function(element, flag) {
    if (flag) impress.removeClass(element, 'disabled');
    else impress.addClass(element, 'disabled');
  };

  //unused functions removed here
  // --------------------------------------------------------------

  // Copypaste utils

  // Call disableSelection on page load with element to disable or without parameters to disable selection in whole page
  impress.disableSelection = function(target) {
    target = target || impress.html;
    if (typeof(target.onselectstart) !== 'undefined') target.onselectstart = impress.falseness; // For IE
    else if (typeof(target.style.MozUserSelect) !== 'undefined') { //For Firefox
      target.style.MozUserSelect='none';
      // if (target === body || target === impress.html)
      //   for (var i = 0; i < body.children.length; i++)
      //     body.children[i].style.MozUserSelect='none';
    } else target.onmousedown = impress.falseness; // All other browsers (Opera)
    target.style.cursor = 'default';
  };

  impress.disableContextMenu = function(target) {
    target = target || impress.html;
    impress.addEvent(document, 'contextmenu', function(event) {
      event = event || window.event;
      if (document.addEventListener) event.preventDefault();
      else event.returnValue = false;
    });
  };

  impress.disableCopy = function(target) {
    target = target || impress.html;
    var fn = function(event) {
      event = event || window.event;
      if (impress.clipboardData) impress.clipboardData.setData('Text', '');
      event.returnValue = false;
      if (event.preventDefault) event.preventDefault();
      return false;
    };
    impress.addEvent(target, 'copy', fn);

    /*impress.addEvent(target, 'keydown', function(event) {
      event = event || window.event;
      event.returnValue = false;
      var key = event.keyCode;
      var ctrlDown = event.ctrlKey || event.metaKey; // Mac support
      var result = true;

      console.log('key=' + key + ' ctrlDown=' + ctrlDown);
      // Check for Alt+Gr (http://en.wikipedia.org/wiki/AltGr_key)
      if (ctrlDown && event.altKey) result = true;
      else if (ctrlDown && key === 67) result = false  // ctrl+c
      else if (ctrlDown && key === 86) result = false  // ctrl+v
      else if (ctrlDown && key === 88) result = false; // ctrl+x

      event.returnValue = result;
      return result;
    });*/
  };

  // Cookie utils

  impress.getCookie = function(name) {
    var matches = document.cookie.match(new RegExp(
      '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
    ));
    return matches ? decodeURIComponent(matches[1]) : false;
  };

  impress.setCookie = function(name, value) {
    var cookie = name + '=' + escape(value) + '; path=/';
    document.cookie = cookie;
  };

  impress.deleteCookie = function(name) {
    impress.setCookie(name, null, { expires: -1 });
  };

  /**
   * Set given styles to element
   * @param {HTMLElement} element
   * @param {(object<string,string>|string)} styles object containing styles in key-value pairs or CSS string
   * @returns {boolean}
   */
  impress.setStyles = function(element, styles) {
    if (!(impress.isElement(element) && styles)) {
      return false;
    } else {
      var props = { //taken from Emmet lib - https://github.com/emmetio/emmet/blob/master/lib/resolver/css.js#L155
        'webkit': 'animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, appearance, backface-visibility, background-clip, background-composite, background-origin, background-size, border-fit, border-horizontal-spacing, border-image, border-vertical-spacing, box-align, box-direction, box-flex, box-flex-group, box-lines, box-ordinal-group, box-orient, box-pack, box-reflect, box-shadow, color-correction, column-break-after, column-break-before, column-break-inside, column-count, column-gap, column-rule-color, column-rule-style, column-rule-width, column-span, column-width, dashboard-region, font-smoothing, highlight, hyphenate-character, hyphenate-limit-after, hyphenate-limit-before, hyphens, line-box-contain, line-break, line-clamp, locale, margin-before-collapse, margin-after-collapse, marquee-direction, marquee-increment, marquee-repetition, marquee-style, mask-attachment, mask-box-image, mask-box-image-outset, mask-box-image-repeat, mask-box-image-slice, mask-box-image-source, mask-box-image-width, mask-clip, mask-composite, mask-image, mask-origin, mask-position, mask-repeat, mask-size, nbsp-mode, perspective, perspective-origin, rtl-ordering, text-combine, text-decorations-in-effect, text-emphasis-color, text-emphasis-position, text-emphasis-style, text-fill-color, text-orientation, text-security, text-stroke-color, text-stroke-width, transform, transition, transform-origin, transform-style, transition-delay, transition-duration, transition-property, transition-timing-function, user-drag, user-modify, user-select, writing-mode, svg-shadow, box-sizing, border-radius',
        'moz': 'animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, appearance, backface-visibility, background-inline-policy, binding, border-bottom-colors, border-image, border-left-colors, border-right-colors, border-top-colors, box-align, box-direction, box-flex, box-ordinal-group, box-orient, box-pack, box-shadow, box-sizing, column-count, column-gap, column-rule-color, column-rule-style, column-rule-width, column-width, float-edge, font-feature-settings, font-language-override, force-broken-image-icon, hyphens, image-region, orient, outline-radius-bottomleft, outline-radius-bottomright, outline-radius-topleft, outline-radius-topright, perspective, perspective-origin, stack-sizing, tab-size, text-blink, text-decoration-color, text-decoration-line, text-decoration-style, text-size-adjust, transform, transform-origin, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, user-focus, user-input, user-modify, user-select, window-shadow, background-clip, border-radius',
        'ms': 'accelerator, backface-visibility, background-position-x, background-position-y, behavior, block-progression, box-align, box-direction, box-flex, box-line-progression, box-lines, box-ordinal-group, box-orient, box-pack, content-zoom-boundary, content-zoom-boundary-max, content-zoom-boundary-min, content-zoom-chaining, content-zoom-snap, content-zoom-snap-points, content-zoom-snap-type, content-zooming, filter, flow-from, flow-into, font-feature-settings, grid-column, grid-column-align, grid-column-span, grid-columns, grid-layer, grid-row, grid-row-align, grid-row-span, grid-rows, high-contrast-adjust, hyphenate-limit-chars, hyphenate-limit-lines, hyphenate-limit-zone, hyphens, ime-mode, interpolation-mode, layout-flow, layout-grid, layout-grid-char, layout-grid-line, layout-grid-mode, layout-grid-type, line-break, overflow-style, perspective, perspective-origin, perspective-origin-x, perspective-origin-y, scroll-boundary, scroll-boundary-bottom, scroll-boundary-left, scroll-boundary-right, scroll-boundary-top, scroll-chaining, scroll-rails, scroll-snap-points-x, scroll-snap-points-y, scroll-snap-type, scroll-snap-x, scroll-snap-y, scrollbar-arrow-color, scrollbar-base-color, scrollbar-darkshadow-color, scrollbar-face-color, scrollbar-highlight-color, scrollbar-shadow-color, scrollbar-track-color, text-align-last, text-autospace, text-justify, text-kashida-space, text-overflow, text-size-adjust, text-underline-position, touch-action, transform, transform-origin, transform-origin-x, transform-origin-y, transform-origin-z, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, user-select, word-break, wrap-flow, wrap-margin, wrap-through, writing-mode',
        'o': 'dashboard-region, animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, border-image, link, link-source, object-fit, object-position, tab-size, table-baseline, transform, transform-origin, transition, transition-delay, transition-duration, transition-property, transition-timing-function, accesskey, input-format, input-required, marquee-dir, marquee-loop, marquee-speed, marquee-style'
      };
      for (var p in props) {
        props[p] = props[p].split(/\s*,\s*/);
      }

      //transform CSS string to Object
      if (typeof  styles == "string") {
        var stylesStr = styles;
        styles = {};
        stylesStr.split(/\s*;\s*/).filter(Boolean).forEach(function(val) {
          //split by first ":"
          var delimPos = val.search(/\s*:\s*/);
          var delimLength = val.match(/\s*:\s*/)[0].length;
          var key = val.substr(0, delimPos),
              val = val.substr(delimPos + delimLength);
          styles[key] = val;//storing to object
        })
      }

      if (typeof styles == "object")
        for (var i in styles) {
          if (!i || !styles[i])break;
          var keys = [i];
          //adding vendor prefixes if needed
          for (var p in props) {
            if (props[p].indexOf(i) >= 0) {
              keys.push('-' + p + '-' + i);
            }
          }
          keys.forEach(function(key) {
            key = dashedToUpperCase(key);
            element.style[key] = styles[i];
          })
        }
    }
    return true;

    function dashedToUpperCase(key) {
      return key.replace(/-(\w)/g, function(match, p1) {
        return p1.toUpperCase();
      })
    }
  };

  /**
   * Create popup
   * @param {String|HTMLElement} innerContent Selector, HTML or HTMLElement
   */
  impress.popup = function(innerContent) {
    var popup = document.createElement('div'),
        wrapper = document.createElement('div'),
        content = document.createElement('div');

    popup.appendChild(content);
    wrapper.appendChild(popup);
    impress.body.appendChild(wrapper);

    impress.setStyles(wrapper, {
      height: window.innerHeight + 'px',
      width: window.innerWidth + 'px',
      'line-height': window.innerHeight + 'px',//vertical centering
      position: 'absolute',
      'z-index': '10',
      'text-align': 'center',//horizontal centering
      overflow: 'hidden',
      'transition': '0.5s',
      background: 'rgba(0, 0, 0, 0.5)',
      opacity: '0',
    });
    setTimeout(function() {
      impress.setStyles(wrapper, {
        opacity: '1',
      });
    }, 50);
    var POPUP_MARGIN = 10;
    var POPUP_PADDING = {
      VER: 20,
      HOR: 15,
    };
    impress.setStyles(popup, {
      display: 'inline-block',
      background: 'white',
      'box-shadow': '2px 2px 10px black',
      'min-width': '300px',
      'max-width': (wrapper.offsetWidth - POPUP_MARGIN * 2 /*- POPUP_PADDING.HOR * 2 - 1*/) + 'px',
      'max-height': (wrapper.offsetHeight - POPUP_MARGIN * 2 /*- POPUP_PADDING.VER * 2 - 3*/) + 'px',
      'min-height': '100px',
      overflow: 'auto',
      margin: POPUP_MARGIN + 'px',
      padding: POPUP_PADDING.VER + 'px ' + POPUP_PADDING.HOR + 'px',
      'box-sizing': 'border-box',//include padding to height/width
      'text-align': 'initial',
      'line-height': 'initial',
      'vertical-align': 'middle',//vertical centering
    });
    impress.setStyles(content, {
      display: 'inline-block',
    });
    var body_prev_overflow = impress.body.style.overflow;
    impress.setStyles(impress.body, {
      overflow: 'hidden'
    });

    /**@type {HTMLElement}*/
    var element;
    try { element = impress.element(innerContent);} catch (e) { }
    if (element) {
      var previouseParent = element.parentNode;
      var previouseSibling = element.nextElementSibling;
      content.appendChild(element/*.cloneNode(true)*/);
    } else if (typeof innerContent == "string") {
      content.innerHTML = innerContent;
    }

    impress.on('resize', function() {
      impress.setStyles(wrapper, {
        height: window.innerHeight + 'px',
        width: window.innerWidth + 'px',
        'line-height': window.innerHeight + 'px',
      });
      impress.setStyles(popup, {
        'max-width': (wrapper.offsetWidth - 10 * 2 /*- 15*2 -1*/) + 'px',
        'max-height': (wrapper.offsetHeight - 10 * 2 /*-20*2 -3*/) + 'px',
      });
    });

    impress.on('click', wrapper, function handler(event) {
      if (event.target != wrapper) return true;
      impress.setStyles(wrapper, {
        opacity: '0',
      });
      setTimeout(function() {
        if (previouseParent)previouseParent.insertBefore(content.childNodes.item(0), previouseSibling);
        impress.body.removeChild(wrapper);
        impress.body.style.overflow = body_prev_overflow;
      }, 500);//wait 0.5s for animation end
      impress.removeEvent(wrapper, 'click', handler);
      event.stopImmediatePropagation();
      return false;
    })
  };

} (global.impress = global.impress || {}));
