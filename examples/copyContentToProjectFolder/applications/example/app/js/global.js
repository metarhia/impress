if (typeof(window) != 'undefined') window.global = window;

global.isBrowser = typeof(exports) === 'undefined';
global.isServer = !isBrowser;

global.falseness = function() { return false; }

// --- Inheritance ---

Function.prototype.override = function(fn) {
  var superFunction = this;
  return function() {
    this.inherited = superFunction;
    return fn.apply(this, arguments);
  }
}

// --- Array utils ---

global.arrayDelete = function(array, element) {
  for (var i in array) {
    if (array[i] == element) {
      array.splice(i, 1);
      return i;
    }
  }
}

/*
// Remove element by key
Array.prototype.remove = function(key) {
  this.splice(key, 1);
}

// Remove element by key
Array.prototype.remove = function(key) {
  for(var i = 0; i < this.length; ++i) if (this[i] == key) {
    this.splice(i, 1);
    return;
  }
}

// Remove element by value
Array.prototype.delete = function(value) {
  for (var key in this)
    if (this[key] == value)
      this.splice(key, 1);
}
*/

global.inArray = Array.prototype.indexOf ? function(array, value) {
  return array.indexOf(value) != -1;
} : function(array, value) {
  var i = array.length;
  while (i--) if (array[i] === value) return true;
  return false;
}

// --- Object utils ---

// extend obj with properties of ext
global.extend = function(obj, ext) {
  for (var property in ext) obj[property] = ext[property];
  return obj;
}

// clone object and extend it of ext specified
global.clone = function(obj, ext) {
  var newObj = (obj instanceof Array) ? [] : {};
  for (var i in obj) {
    //if (i == 'clone') continue;
    if (obj[i] && typeof(obj[i]) == "object") newObj[i] = obj[i].duplicate();
    else newObj[i] = obj[i];
  }
  if (typeof(ext) == 'object') {
    for (var i in ext) {
      //if (i == 'clone') continue;
      if (ext[i] && typeof(ext[i]) == "object") newObj[i] = ext[i].duplicate();
      else newObj[i] = ext[i];
    }
  }
  return newObj;
}

// --- String utils ---

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

if (typeof(String.prototype.endsWith)!= 'function') {
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
  s = this;
  var i = s.indexOf(prefix);
  if (i >= 0) s = s.substring(i + prefix.length);
  else return '';
  if (suffix) {
    i = s.indexOf(suffix);
    if (i >= 0) s = s.substring(0, i);
    else return '';
  }
  return s;
}

// Add toISOString support if no native support (e.g. "2012-01-01T12:30:15.120Z")
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

// toSimpleString return date string in local timezone (e.g. "2012-01-01 12:30")
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

// Parse duration to seconds: duration("1d 10h 7m 13s")
global.duration = function(s) {
  var result  = 0,
    days    = s.match(/(\d+)\s*d/),
    hours   = s.match(/(\d+)\s*h/),
    minutes = s.match(/(\d+)\s*m/),
    seconds = s.match(/(\d+)\s*s/);
  if (days)    result += parseInt(days[1])*86400;
  if (hours)   result += parseInt(hours[1])*3600;
  if (minutes) result += parseInt(minutes[1])*60;
  if (seconds) result += parseInt(seconds[1]);
  return result;
}

// Generate random key with specified length from string of possible characters
global.generateKey = function(length, possible) {
  var key = "";
  for (var i=0; i<length; i++) key += possible.charAt(random(0,possible.length-1));
  return key;
}

// Generate GUID/UUID  RFC4122 compliant
global.generateGUID = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

// IP Address from string e.g. "10.18.8.1" to signed integer
global.ip2int = function(ip) {
  return ip.split('.').reduce(function(res, item) {
    return (res << 8)+ +item
  }, 0);
};

// function global.escapeRegExp(string)
(function() {

  var specials = [
      // order matters for these
      "-", "[", "]",
      // order doesn't matter for any of these
      "/", "{", "}", "(", ")", "*", "+", "?", ".", "\\", "^", "$", "|"
    ],
    regex = RegExp('['+specials.join('\\')+']', 'g');

  global.escapeRegExp = function(str) {
    return str.replace(regex, "\\$&");
  };

  // escapeRegExp("/path/to/res?search=this.that")

}());

// Add single slash to the right with no duplicates
global.lastSlash = function(path) {
  return path+(path.slice(-1) == '/' ? '' : '/');
}

// Return true for scalar vars and false for arrays and objects
global.isScalar = function(variable) {
  return (/boolean|number|string/).test(typeof(variable));
}

// Return random number less then one argument random(100) or between two argumants random(50,150)
global.random = function() {
  if (arguments.length == 1) var min = 0, max = arguments[0];
  else var min = arguments[0], max = arguments[1];
  return min+Math.floor(Math.random()*(max-min+1));
}

// Shuffle array
global.shuffle = function(arr) {
  var rnd, result = [];
  for (var i = 0; i < arr.length; ++i) {
    rnd = random(i);
    result[i-1] = result[rnd];
    result[rnd] = item;
  }
  return result;
}


// --- Browser functionality ---
if (isBrowser) {

  if (window) window.global = window;

  global.html = document.documentElement || document.getElementsByTagName('html')[0];
  global.head = document.head || document.getElementsByTagName('head')[0];
  global.body = null;

  // --- Async script loader ---

  global.scripts = {};

  global.require = function(scripts, callback) {
    var counter=0,
      scriptLoaded = function() {
        counter++;
        this.script.loaded = true;
        global.scripts[script.namespace] = this.script;
        if (counter == scripts.length && callback) callback();
      },
      scriptError = function() {
        counter++;
        delete this.script;
        head.removeChild(this);
        if (counter == scripts.length && callback) callback();
      }
    for (var i=0; i<scripts.length; ++i) {
      var path = scripts[i],
        file = path.replace(/^.*[\\\/]/, ''),
        namespace = file.replace(/\.[^/.]+$/, "");
      if (!global.scripts[namespace]) {
        var script = {"namespace":namespace,"file":file,"url":path,"element":null,"loaded":false};
        script.element = document.createElement('script');
        script.element.script = script;
        addEvent(script.element, 'load', scriptLoaded);
        addEvent(script.element, 'error', scriptError);
        script.element.src = path;
        head.appendChild(script.element);
      }
    }
  }

  global.free = function(scripts, callback) {
    for (var i=0; i<scripts.length; ++i) {
      var namespace = scripts[i],
        script = global.scripts[namespace];
      if (script) {
        head.removeChild(script.element);
        if (global[namespace]) delete global[namespace];
        delete global.scripts[namespace];
      }
    }
    if (callback) callback();
  }

  // --- Other utils ---

  global.preloadImages = function(images, callback) {
    var counter=0;
    for (var i=0; i<images.length; i++) {
      var img = document.createElement('img'),
        fn = function() {
          counter++;
          if (counter == images.length) callback();
        }
      addEvent(img, 'load', fn);
      addEvent(img, 'error', fn);
      img.src = images[i];
    }
  }

  global.parseUrl = function(url) {
    //var a = document.createElement('a');
    //a.href = url;
    return a;
  }

  if (typeof(JSON) !== "object") require(["json2.js"]);

  // --- Platform detection ---

  global.platform = {
    iPhone: navigator.userAgent.match(/iPhone/i),
    iPod: navigator.userAgent.match(/iPod/i),
    iPad: navigator.userAgent.match(/iPad/i),
    Android: navigator.userAgent.match(/Android/i),
    IE: navigator.appName.indexOf("Microsoft") != -1,
    IEMobile: navigator.userAgent.match(/IEMobile/i),
    Chrome: !!window.chrome, // navigator.userAgent.match(/Chrome/i),
    Safari: navigator.userAgent.match(/Safari/i) && !window.chrome,
    FireFox: navigator.userAgent.indexOf("Firefox") > -1,
    BlackBerry: navigator.userAgent.match(/BlackBerry/i),
    WebOS: navigator.userAgent.match(/webOS/i),
    Opera: window.opera, // navigator.userAgent.indexOf("Presto") > -1
    OperaMini: navigator.userAgent.match(/Opera Mini/i),
    OperaMobi: navigator.userAgent.match(/Opera Mobi/i)
  }

  global.platform.iOS = platform.iPhone || platform.iPod || platform.iPad;
  global.platform.Mobile = platform.iOS || platform.Android || platform.OperaMini || platform.OperaMobi || platform.BlackBerry || platform.WebOS;
  global.platform.WebKit = platform.Chrome || platform.Safari;

  if (platform.IE) platform.IEVersion = parseFloat(navigator.appVersion.split("MSIE")[1]);

  // --- DOM utils ---

  global.id = function(id) {
    return document.getElementById(id);
  }

  if (document.getElementsByClassName) {
    global.getElementsByClass = function(classList, context) {
      return (context || document).getElementsByClassName(classList)
    }
  } else {
    global.getElementsByClass = function(classList, context) {
      var context = context || document,
        list = context.getElementsByTagName('*'),
        classArray = classList.split(/\s+/),
        result = [], i,j;
      for (i=0; i<list.length; i++) {
        for(j=0; j<classArray.length; j++) {
          if(list[i].className.search('\\b'+classArray[j]+'\\b') != -1) {
            result.push(list[i]);
            break;
          }
        }
      }
      return result;
    }
  }

  global.addClass = function(element, className) {
    var regex = new RegExp("(^|\\s)"+className+"(\\s|$)", "g");
    if (regex.test(element.className))
    return element.className = (element.className+" "+className).replace(/\s+/g, " ").replace(/(^ | $)/g, "");
  }
 
  global.removeClass = function(element, className) {
    var regex = new RegExp("(^|\\s)"+className+"(\\s|$)", "g");
    element.className = element.className.replace(regex, "$1").replace(/\s+/g, " ").replace(/(^ | $)/g, "");
  }

  global.insertAfter = function(parent, node, referenceNode) {
    parent.insertBefore(node, referenceNode.nextSibling);
  }

  global.getFrameDocument = function(fname) {
    if (platform.IE) return frames[fname].document;
    else return id(fname).contentDocument; 
  }

  global.addEvent = function(element, event, fn) {
    if (element.addEventListener) {
      return element.addEventListener(event, fn, false);
    } else if (element.attachEvent) {
      callback = function() { fn.call(element) }
      return element.attachEvent('on'+event, callback);
    } else return false;
  }

  global.removeEvent = function(element, event, fn) {
    if (element.removeEventListener) {
      return element.removeEventListener(event, fn, false);
    } else if (element.detachEvent) { 
      return element.detachEvent('on'+event, fn);
    } else return false;
  }

  global.onLoad = function(fn) {
    addEvent(global, 'load', fn);
  };

  onLoad(function() {
    global.body = document.body || document.getElementsByTagName('body')[0];
  });

  global.onUnload = function(fn) {
    addEvent(global, 'unload', fn);
  };

  // fn(event) should terurn not empty string for confirmation dialog
  global.onBeforeUnload = function(fn) {
    addEvent(global, 'beforeunload', function(event) {
      var message = fn(event);
      if (typeof(event) == "undefined") event = window.event;
      if (event) event.returnValue = message;
      return message;
    });
  };

  // fn(message, source, lineno)
  global.onError = function(fn) {
    addEvent(global, 'error', fn);
  };

  // preloadImages(["my.gif","/images/logo.jpg"], function() {...})
  global.preloadImages = function(images, callback) {
    var counter=0;
    for (var i=0; i<images.length; i++) {
      var img = document.createElement('img'),
        fn = function() {
          counter++;
          if (counter == images.length) callback();
        }
      addEvent(img, 'load', fn);
      addEvent(img, 'error', fn);
      img.src = images[i];
    }
  }

  // --- Copypaste utils

  // Call disableSelection on page load with element to disable or without parameters to disable selection in whole page
  global.disableSelection = function(target) {
    target = target || html;
    if (typeof(target.onselectstart) != "undefined") target.onselectstart=falseness //For IE
    else if (typeof(target.style.MozUserSelect) != "undefined") { //For Firefox
      target.style.MozUserSelect="none";
      //if (target == body || target == html)
      //  for (var i=0; i<body.children.length; i++)
      //    body.children[i].style.MozUserSelect="none";
    } else target.onmousedown=falseness; //All other browsers (Opera)
    target.style.cursor = "default";
  }

  global.disableContextMenu = function(target) {
    target = target || html;
    addEvent(document, 'contextmenu', function(event) {
      event = event || window.event;
      if (document.addEventListener) event.preventDefault();
      else event.returnValue = false;
    });
  }

  global.disableCopy = function(target) {
    target = target || html;
    var fn = function(event) {
      event = event || window.event;
      if (global.clipboardData) clipboardData.setData("Text", '');
      event.returnValue = false;
      if (event.preventDefault) event.preventDefault();
      return false;
    }
    addEvent(target, 'copy', fn);

    /*addEvent(target, 'keydown', function(event) {
      event = event || window.event;
      event.returnValue = false;
      var key = event.keyCode;
      var ctrlDown = event.ctrlKey || event.metaKey; // Mac support
      var result = true;
  
      console.log('key='+key+' ctrlDown='+ctrlDown);
      // Check for Alt+Gr (http://en.wikipedia.org/wiki/AltGr_key)
      if (ctrlDown && event.altKey) result = true;
      else if (ctrlDown && key == 67) result = false  // ctrl+c
      else if (ctrlDown && key == 86) result = false  // ctrl+v
      else if (ctrlDown && key == 88) result = false; // ctrl+x
  
      event.returnValue = result;
      return result;
    });*/
  }

  // --- Cookie utils ---

  global.getCookie = function(name) {
    var matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : false;
  }

  global.setCookie = function(name, value) {
    var cookie = name+"="+escape(value)+"; path=/";
    document.cookie = cookie;
  }
    
  /*

  function setCookie(c_name,value,exdays)  {
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays == null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=c_name + "=" + c_value;
  }

  props
      Объект с дополнительными свойствами для установки cookie:
  
      expires
          Время истечения cookie. Интерпретируется по-разному, в зависимости от типа:
  
              Если число - количество секунд до истечения.
              Если объект типа Date - точная дата истечения.
              Если expires в прошлом, то cookie будет удалено.
              Если expires отсутствует или равно 0, то cookie будет установлено как сессионное и исчезнет при закрытии браузера.
  
      path
          Путь для cookie.
      domain
          Домен для cookie.
      secure
          Пересылать cookie только по защищенному соединению.
  
  function setCookie(name, value, props) {
    props = props || {}
    var exp = props.expires
    if (typeof exp == "number" && exp) {
      var d = new Date()
      d.setTime(d.getTime() + exp*1000)
      exp = props.expires = d
    }
    if(exp && exp.toUTCString) { props.expires = exp.toUTCString() }
  
    value = encodeURIComponent(value)
    var updatedCookie = name + "=" + value
    for(var propName in props){
      updatedCookie += "; " + propName
      var propValue = props[propName]
      if(propValue !== true){ updatedCookie += "=" + propValue }
    }
    document.cookie = updatedCookie
  
  } */
  
  global.deleteCookie = function(name) {
    setCookie(name, null, { expires: -1 });
  }

  // --- Other utils ---

  global.setObjectOpacity = function(element, opacity) {
    if (platform.IE) element.style.filter = "alpha(opacity:"+opacity+")";
    else {
      opacity = (opacity == 100) ? 99.999 : opacity; //99.9 for Firefox flicker bug
      element.style.KHTMLOpacity = opacity / 100; // Konqueror, Safari
      element.style.MozOpacity = opacity / 100; // Old Mozilla and Firefox
      element.style.opacity = opacity / 100; // CSS3,  Safari , new Firefox (Gecko)
    }
  }
}

global.arrayToXml = function(arr, t) {
  var s = new Array(), i, l = arr.length, v;
  var t2 = (t.charAt(t.length-1) == 's') ? t.substring(0,t.length-1) : t;
  for(i=0; i<l; i++){
    v = arr[i];
    switch (typeof v) {
      case 'undefined':
      case 'function':
      case 'unknown': break;
      case 'object': if (v != null) { s.push(objectToXml(v,t2)); } break;
      case 'string': v = stringToXml(v);
      default:s.push('<'+t2+'>'+v+'');
    }
  }
  if (s.length > 1) return '<'+t+'>'+s.join('')+'';
  return s;
};

global.objectToXml = function(obj, t) {
  var sa = new Array(''), se = new Array('');
  if (!t) t = /*obj._tagName ||*/ 'object';
  for(var i in obj) {
    if (obj.hasOwnProperty(i) && i.charAt(0)!='_') {
      var v = obj[i];
      switch (typeof v) {
        case 'undefined':
        case 'function':
        case 'unknown': break;
        case 'object': if (v != null) { se.push(objectToXml(v,i)); } break;
        case 'string': v = stringToXml(v);
        default: sa.push(' '+i+'="'+v+'"');
      }
    }
  }
  var s = se.join('');
  return '<'+t+sa.join('')+((s!='') ? '>'+s+'' : '/>');
};

global.stringToXml = function(str) {
  return str
    .replace('&','&amp;')
    .replace('<','&lt;')
    .replace('>','&gt;')
    .replace('\'','&apos;')
    .replace('"','&quot;');
};