'use strict';

// Browser functionality

if (isBrowser) {

  global.html = document.documentElement || document.getElementsByTagName('html')[0];
  global.head = document.head || document.getElementsByTagName('head')[0];
  global.body = null;

  // Async script loader

  global.scripts = {};

  global.require = function(scripts, callback) {
    var counter=0,
      scriptLoaded = function() {
        counter++;
        this.script.loaded = true;
        global.scripts[script.namespace] = this.script;
        if (counter === scripts.length && callback) callback();
      },
      scriptError = function() {
        counter++;
        delete this.script;
        head.removeChild(this);
        if (counter === scripts.length && callback) callback();
      }
    for (var i=0; i<scripts.length; ++i) {
      var path = scripts[i],
        file = path.replace(/^.*[\\\/]/, ''),
        namespace = file.replace(/\.[^/.]+$/, '');
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

  // Other utils

  global.preloadImages = function(images, callback) {
    var counter=0;
    function fnEvent() {
      counter++;
      if (counter === images.length) callback();
    }
    for (var i=0; i<images.length; i++) {
      var img = document.createElement('img');
      addEvent(img, 'load', fnEvent);
      addEvent(img, 'error', fnEvent);
      img.src = images[i];
    }
  }

  global.parseUrl = function(url) {
    //var a = document.createElement('a');
    //a.href = url;
    return a;
  }

  if (typeof(JSON) !== 'object') require(['json2.js']);

  // Platform detection

  global.platform = {
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
  }

  global.platform.iOS = platform.iPhone || platform.iPod || platform.iPad;
  global.platform.Mobile = platform.iOS || platform.Android || platform.OperaMini || platform.OperaMobi || platform.BlackBerry || platform.WebOS;
  global.platform.WebKit = platform.Chrome || platform.Safari;

  if (platform.IE) platform.IEVersion = parseFloat(navigator.appVersion.split('MSIE')[1]);

  // DOM utils

  global.id = function(id) {
    return document.getElementById(id);
  }

  if (document.getElementsByClassName) {
    global.getElementsByClass = function(classList, context) {
      return (context || document).getElementsByClassName(classList);
    }
  } else {
    global.getElementsByClass = function(classList, context) {
      context = context || document;
      var list = context.getElementsByTagName('*'),
        classArray = classList.split(/\s+/),
        result = [], i,j;
      for (i=0; i<list.length; i++) {
        for(j=0; j<classArray.length; j++) {
          if(list[i].className.search('\\b' + classArray[j] + '\\b') !== -1) {
            result.push(list[i]);
            break;
          }
        }
      }
      return result;
    }
  }

  global.addClass = function(element, className) {
    var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
    if (regex.test(element.className)) {
      element.className = (element.className + ' ' + className).replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
      return element.className;
    }
  }
 
  global.removeClass = function(element, className) {
    var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
    element.className = element.className.replace(regex, '$1').replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
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
      var callback = function() {
        fn.call(element);
      };
      return element.attachEvent('on' + event, callback);
    } else return false;
  }

  global.removeEvent = function(element, event, fn) {
    if (element.removeEventListener) {
      return element.removeEventListener(event, fn, false);
    } else if (element.detachEvent) { 
      return element.detachEvent('on' + event, fn);
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
      if (typeof(event) === 'undefined') event = window.event;
      if (event) event.returnValue = message;
      return message;
    });
  };

  // fn(message, source, lineno)
  global.onError = function(fn) {
    addEvent(global, 'error', fn);
  };

  // Copypaste utils

  // Call disableSelection on page load with element to disable or without parameters to disable selection in whole page
  global.disableSelection = function(target) {
    target = target || html;
    if (typeof(target.onselectstart) !== 'undefined') target.onselectstart = falseness; //For IE
    else if (typeof(target.style.MozUserSelect) !== 'undefined') { //For Firefox
      target.style.MozUserSelect='none';
      //if (target === body || target === html)
      //  for (var i=0; i<body.children.length; i++)
      //    body.children[i].style.MozUserSelect='none';
    } else target.onmousedown = falseness; //All other browsers (Opera)
    target.style.cursor = 'default';
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
      if (global.clipboardData) clipboardData.setData('Text', '');
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
  
      console.log('key=' + key + ' ctrlDown=' + ctrlDown);
      // Check for Alt+Gr (http://en.wikipedia.org/wiki/AltGr_key)
      if (ctrlDown && event.altKey) result = true;
      else if (ctrlDown && key === 67) result = false  // ctrl+c
      else if (ctrlDown && key === 86) result = false  // ctrl+v
      else if (ctrlDown && key === 88) result = false; // ctrl+x
  
      event.returnValue = result;
      return result;
    });*/
  }

  // Cookie utils

  global.getCookie = function(name) {
    var matches = document.cookie.match(new RegExp(
      '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
    ));
    return matches ? decodeURIComponent(matches[1]) : false;
  }

  global.setCookie = function(name, value) {
    var cookie = name + '=' + escape(value) + '; path=/';
    document.cookie = cookie;
  }

  global.deleteCookie = function(name) {
    setCookie(name, null, { expires: -1 });
  }
  
}
