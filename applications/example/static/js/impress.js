﻿'use strict';

window.global = window;
global.api = {};
global.api.impress = {};
global.application = {};

api.impress.falseness = function() { return false; };
api.impress.trueness = function() { return true; };
api.impress.emptyness = function() { };

// DOM utilities
//
api.dom = {};
api.dom.html = document.documentElement || document.getElementsByTagName('html')[0];
api.dom.head = document.head || document.getElementsByTagName('head')[0];
api.dom.body = null;
api.dom.form = null;

// Platform detection
//
api.dom.platform = {
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

var platform = api.dom.platform;

platform.iOS = platform.iPhone || platform.iPod || platform.iPad;
platform.Mobile = platform.iOS || platform.Android || platform.OperaMini || platform.OperaMobi || platform.BlackBerry || platform.WebOS;
platform.WebKit = platform.Chrome || platform.Safari;

if (platform.IE) platform.IEVersion = parseFloat(navigator.appVersion.split('MSIE')[1]);

// Patch page links to prevent page reload
//
api.dom.fixLinks = function(persist) {

  function makeLink(link) {
    link.addEventListener('click', function(/*event*/) {
      //event.preventDefault();
      if (persist && this.host === window.location.host) localStorage.setItem('location', this.pathname + this.search);
      window.location = this.href;
    }, false);
  }

  if (platform.iOS) {
    if (persist === null) persist = true;
    persist = persist && localStorage;
    if (persist) {
      var currentLocation = window.location.pathname + window.location.search,
          storedLocation = localStorage.getItem('location');
      if (storedLocation && storedLocation !== currentLocation) window.location = storedLocation;
    }
    var links = document.getElementsByTagName('a');
    for (var i = 0; i < links.length; i++) makeLink(links[i]);
  }

};

// Save cookies in localstorage
//
api.dom.fixCookie = function(sessionCookieName) {
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

// Get element by tag id
//
api.dom.id = function(id) {
  return document.getElementById(id);
};

if (document.getElementsByClassName) {
  api.dom.getElementsByClass = function(classList, context) {
    return (context || document).getElementsByClassName(classList);
  };
} else {
  api.dom.getElementsByClass = function(classList, context) {
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

// Add element class
//
api.dom.addClass = function(element, className) {
  var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
  if (regex.test(element.className)) {
    element.className = (element.className + ' ' + className).replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
    return element.className;
  }
};

// Remove element class
//
api.dom.removeClass = function(element, className) {
  var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
  element.className = element.className.replace(regex, '$1').replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
};

// Check element class
//
api.dom.hasClass = function(element, className) {
  element = api.dom.element(element);
  return element.className.match(new RegExp('(^|\b)' + className + '($|\b)'));
};

// Toggle element class
//
api.dom.toggleClass = function(element, className) {
  element = api.dom.element(element);
  if (api.dom.hasClass(element, className)) api.dom.removeClass(element, className);
  else api.dom.addClass(element, className);
};

// Insert element after
//
api.dom.insertAfter = function(parent, node, referenceNode) {
  parent.insertBefore(node, referenceNode.nextSibling);
};

// Add element event
//
api.dom.addEvent = function(element, event, fn) {
  if (element.addEventListener) {
    return element.addEventListener(event, fn, false);
  } else if (element.attachEvent) {
    var callback = function() {
      fn.call(element);
    };
    return element.attachEvent('on' + event, callback);
  } else return false;
};

// Remove element event
//
api.dom.removeEvent = function(element, event, fn) {
  if (element.removeEventListener) {
    return element.removeEventListener(event, fn, false);
  } else if (element.detachEvent) {
    return element.detachEvent('on' + event, fn);
  } else return false;
};

// Events: 'load', 'unload', 'click', etc.
//
api.dom.on = function(event, element, fn) {
  if (arguments.length === 2) {
    fn = element;
    element = window;
  }
  element = api.dom.element(element);
  if (element) api.dom.addEvent(element, event, fn);
};

// Use element or selector
//
api.dom.element = function(element) {
  if (typeof(element) !== 'string') {
    return element;
  }
  var result;
  try {
    //catching DOMException if element is not a valid selector
    result = document.querySelector(element);
  } catch (e) {
    result = null;
  }
  return result;
};

// Get page body reference
//
api.dom.on('load', function() {
  api.dom.body = document.body || document.getElementsByTagName('body')[0];
});

// fn(event) should terurn not empty string for confirmation dialog
//
api.dom.onBeforeUnload = function(fn) {
  api.dom.addEvent(api.dom, 'beforeunload', function(event) {
    var message = fn(event);
    if (typeof(event) === 'undefined') event = window.event;
    if (event) event.returnValue = message;
    return message;
  });
};

// Fire event
//
api.dom.fireEvent = function(element, eventName) {
  if (element.fireEvent) element.fireEvent('on' + eventName);
  else {
    var event = document.createEvent('Events');
    event.initEvent(eventName, true, false);
    element.dispatchEvent(event);
  }
};

// Enable element
//
api.dom.enable = function(element, flag) {
  if (flag) api.dom.removeClass(element, 'disabled');
  else api.dom.addClass(element, 'disabled');
};

// Visible element
//
api.dom.visible = function(element, flag) {
  if (flag) api.dom.show(element);
  else api.dom.hide(element);
};

// Toggle element
//
api.dom.toggle = function(element) {
  if (api.dom.hasClass(element, 'hidden')) api.dom.show(element);
  else api.dom.hide(element);
};

// Hide element
//
api.dom.hide = function(element) {
  if (!api.dom.hasClass(element, 'hidden')) {
    api.dom.addClass(element, 'hidden');
    element.setAttribute('_display', element.style.display);
    element.style.display = 'none';
  }
};

// Show element
//
api.dom.show = function(element) {
  if (api.dom.hasClass(element, 'hidden')) {
    api.dom.removeClass(element, 'hidden');
    element.style.display = element.getAttribute('_display') || '';
  }
};

// Load element content using AJAX
//
api.dom.load = function(url, element, callback) {
  element.innerHTML = '<div class="progress"></div>';
  api.rpc.get(url, {}, function(err, res) {
    element.innerHTML = res;
    if (callback) callback(err, res, element);
  });
};

// Center element
//
api.dom.alignCenter = function(element) {
  // TODO: implement api.dom.alignCenter
};

// Popup
//
api.dom.popup = function(innerContent) {
  // TODO: decompose api.dom.popup

  var popup = document.createElement('div'),
      wrapper = document.createElement('div'),
      content = document.createElement('div');

  popup.appendChild(content);
  wrapper.appendChild(popup);
  api.dom.body.appendChild(wrapper);

  api.dom.setStyles(wrapper, {
    'height': window.innerHeight + 'px',
    'width': window.innerWidth + 'px',
    'line-height': window.innerHeight + 'px', //vertical centering
    'position': 'absolute',
    'z-index': '10',
    'text-align': 'center', //horizontal centering
    'overflow': 'hidden',
    'transition': '0.5s',
    'background': 'rgba(0, 0, 0, 0.5)',
    'opacity': '0',
  });
  setTimeout(function() {
    api.dom.setStyles(wrapper, {
      'opacity': '1',
    });
  }, 50);
  var POPUP_MARGIN = 10;
  var POPUP_PADDING = {
    VER: 20,
    HOR: 15,
  };
  api.dom.setStyles(popup, {
    display: 'inline-block',
    background: 'white',
    'box-shadow': '2px 2px 10px black',
    'min-width': '300px',
    'max-width': (wrapper.offsetWidth - POPUP_MARGIN * 2 ) + 'px',
    'max-height': (wrapper.offsetHeight - POPUP_MARGIN * 2 ) + 'px',
    'min-height': '100px',
    'overflow': 'auto',
    'margin': POPUP_MARGIN + 'px',
    'padding': POPUP_PADDING.VER + 'px ' + POPUP_PADDING.HOR + 'px',
    'box-sizing': 'border-box', //include padding to height/width
    'text-align': 'initial',
    'line-height': 'initial',
    'vertical-align': 'middle', //vertical centering
  });
  api.dom.setStyles(content, {
    'display': 'inline-block',
  });
  var bodyPrevOverflow = api.dom.body.style.overflow;
  api.dom.setStyles(api.dom.body, {
    'overflow': 'hidden'
  });

  /**@type {HTMLElement}*/
  var element;
    element = api.dom.element(innerContent);
  if (element) {
    var previouseParent = element.parentNode;
    var previouseSibling = element.nextElementSibling;
    content.appendChild(element);
  } else if (typeof(innerContent) === 'string') {
    content.innerHTML = innerContent;
  }

  api.dom.on('resize', function() {
    api.dom.setStyles(wrapper, {
      'height': window.innerHeight + 'px',
      'width': window.innerWidth + 'px',
      'line-height': window.innerHeight + 'px',
    });
    api.dom.setStyles(popup, {
      'max-width': (wrapper.offsetWidth - POPUP_MARGIN * 2 ) + 'px',
      'max-height': (wrapper.offsetHeight - POPUP_MARGIN * 2 ) + 'px',
    });
  });

  api.dom.on('click', wrapper, function handler(event) {
    if (event.target !== wrapper) return true;
    api.dom.setStyles(wrapper, {
      'opacity': '0'
    });
    setTimeout(function() {
      if (previouseParent)previouseParent.insertBefore(content.childNodes.item(0), previouseSibling);
      api.dom.body.removeChild(wrapper);
      api.dom.body.style.overflow = bodyPrevOverflow;
    }, 500); //wait 0.5s for animation end
    api.dom.removeEvent(wrapper, 'click', handler);
    event.stopImmediatePropagation();
    return false;
  });
};

// Set given styles to element
//
api.dom.setStyles = function(element, styles) {
  // TODO: decompose api.dom.setStyles

  var props = { //taken from Emmet lib - https://github.com/emmetio/emmet/blob/master/lib/resolver/css.js#L155
    'webkit': 'animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, appearance, backface-visibility, background-clip, background-composite, background-origin, background-size, border-fit, border-horizontal-spacing, border-image, border-vertical-spacing, box-align, box-direction, box-flex, box-flex-group, box-lines, box-ordinal-group, box-orient, box-pack, box-reflect, box-shadow, color-correction, column-break-after, column-break-before, column-break-inside, column-count, column-gap, column-rule-color, column-rule-style, column-rule-width, column-span, column-width, dashboard-region, font-smoothing, highlight, hyphenate-character, hyphenate-limit-after, hyphenate-limit-before, hyphens, line-box-contain, line-break, line-clamp, locale, margin-before-collapse, margin-after-collapse, marquee-direction, marquee-increment, marquee-repetition, marquee-style, mask-attachment, mask-box-image, mask-box-image-outset, mask-box-image-repeat, mask-box-image-slice, mask-box-image-source, mask-box-image-width, mask-clip, mask-composite, mask-image, mask-origin, mask-position, mask-repeat, mask-size, nbsp-mode, perspective, perspective-origin, rtl-ordering, text-combine, text-decorations-in-effect, text-emphasis-color, text-emphasis-position, text-emphasis-style, text-fill-color, text-orientation, text-security, text-stroke-color, text-stroke-width, transform, transition, transform-origin, transform-style, transition-delay, transition-duration, transition-property, transition-timing-function, user-drag, user-modify, user-select, writing-mode, svg-shadow, box-sizing, border-radius',
    'moz': 'animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, appearance, backface-visibility, background-inline-policy, binding, border-bottom-colors, border-image, border-left-colors, border-right-colors, border-top-colors, box-align, box-direction, box-flex, box-ordinal-group, box-orient, box-pack, box-shadow, box-sizing, column-count, column-gap, column-rule-color, column-rule-style, column-rule-width, column-width, float-edge, font-feature-settings, font-language-override, force-broken-image-icon, hyphens, image-region, orient, outline-radius-bottomleft, outline-radius-bottomright, outline-radius-topleft, outline-radius-topright, perspective, perspective-origin, stack-sizing, tab-size, text-blink, text-decoration-color, text-decoration-line, text-decoration-style, text-size-adjust, transform, transform-origin, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, user-focus, user-input, user-modify, user-select, window-shadow, background-clip, border-radius',
    'ms': 'accelerator, backface-visibility, background-position-x, background-position-y, behavior, block-progression, box-align, box-direction, box-flex, box-line-progression, box-lines, box-ordinal-group, box-orient, box-pack, content-zoom-boundary, content-zoom-boundary-max, content-zoom-boundary-min, content-zoom-chaining, content-zoom-snap, content-zoom-snap-points, content-zoom-snap-type, content-zooming, filter, flow-from, flow-into, font-feature-settings, grid-column, grid-column-align, grid-column-span, grid-columns, grid-layer, grid-row, grid-row-align, grid-row-span, grid-rows, high-contrast-adjust, hyphenate-limit-chars, hyphenate-limit-lines, hyphenate-limit-zone, hyphens, ime-mode, interpolation-mode, layout-flow, layout-grid, layout-grid-char, layout-grid-line, layout-grid-mode, layout-grid-type, line-break, overflow-style, perspective, perspective-origin, perspective-origin-x, perspective-origin-y, scroll-boundary, scroll-boundary-bottom, scroll-boundary-left, scroll-boundary-right, scroll-boundary-top, scroll-chaining, scroll-rails, scroll-snap-points-x, scroll-snap-points-y, scroll-snap-type, scroll-snap-x, scroll-snap-y, scrollbar-arrow-color, scrollbar-base-color, scrollbar-darkshadow-color, scrollbar-face-color, scrollbar-highlight-color, scrollbar-shadow-color, scrollbar-track-color, text-align-last, text-autospace, text-justify, text-kashida-space, text-overflow, text-size-adjust, text-underline-position, touch-action, transform, transform-origin, transform-origin-x, transform-origin-y, transform-origin-z, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, user-select, word-break, wrap-flow, wrap-margin, wrap-through, writing-mode',
    'o': 'dashboard-region, animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, border-image, link, link-source, object-fit, object-position, tab-size, table-baseline, transform, transform-origin, transition, transition-delay, transition-duration, transition-property, transition-timing-function, accesskey, input-format, input-required, marquee-dir, marquee-loop, marquee-speed, marquee-style'
  };

  var p;
  for (p in props) {
    props[p] = props[p].split(/\s*,\s*/);
  }

  //transform CSS string to Object
  if (typeof(styles) === 'string') {
    var stylesStr = styles;
    styles = {};
    stylesStr.split(/\s*;\s*/).filter(Boolean).forEach(function(val) {
      //split by first ':'
      var delimPos = val.search(/\s*:\s*/);
      var delimLength = val.match(/\s*:\s*/)[0].length;
      var key = val.substr(0, delimPos);
      val = val.substr(delimPos + delimLength);
      styles[key] = val; //storing to object
    });
  }

  if (typeof(styles) === 'object') {
    for (var i in styles) {
      if (!i || !styles[i]) break;
      var keys = [i];
      //adding vendor prefixes if needed
      for (p in props) {
        if (props[p].indexOf(i) >= 0) {
          keys.push('-' + p + '-' + i);
        }
      }
      for (var j in keys) {
        var key = dashedToUpperCase(keys[j]);
        element.style[key] = styles[i];
      }
    }
  }
  return true;

  function dashedToUpperCase(key) {
    return key.replace(/-(\w)/g, function(match, p1) {
      return p1.toUpperCase();
    });
  }
};

// Confirmation dialog
//   Buttons: ['Yes', 'No', 'Ok', 'Cancel']
//
api.dom.confirmation = function(title, message, eventYes, buttons) {
  // TODO: implement api.dom.confirmation
};

// Input dialog
//
api.dom.input = function(title, prompt, defaultValue, eventOk) {
};

// Call disableSelection on page load with element to disable or without parameters to disable selection in whole page
//
api.dom.disableSelection = function(target) {
  target = target || api.dom.html;
  if (typeof(target.onselectstart) !== 'undefined') target.onselectstart = api.impress.falseness; // For IE
  else if (typeof(target.style.MozUserSelect) !== 'undefined') { //For Firefox
    target.style.MozUserSelect='none';
    // if (target === body || target === api.dom.html)
    //   for (var i = 0; i < body.children.length; i++)
    //     body.children[i].style.MozUserSelect='none';
  } else target.onmousedown = api.impress.falseness; // All other browsers (Opera)
  target.style.cursor = 'default';
};

// Disable browser context menu
//
api.dom.disableContextMenu = function(target) {
  target = target || api.dom.html;
  api.dom.addEvent(document, 'contextmenu', function(event) {
    event = event || window.event;
    if (document.addEventListener) event.preventDefault();
    else event.returnValue = false;
  });
};

// Disable browser content copy function
//
api.dom.disableCopy = function(target) {
  target = target || api.dom.html;
  var fn = function(event) {
    event = event || window.event;
    if (api.dom.clipboardData) api.dom.clipboardData.setData('Text', '');
    event.returnValue = false;
    if (event.preventDefault) event.preventDefault();
    return false;
  };
  api.dom.addEvent(target, 'copy', fn);

  /*api.dom.addEvent(target, 'keydown', function(event) {
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

// Escape HTML
//
api.dom.htmlEscape = function(content) {
  return content.replace(/[&<>"'\/]/g,function(char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[char]);
  });
};

// Simple string template
//
api.dom.template = function(tpl, data, escapeHtml) {
  return tpl.replace(/@([\-\.0-9a-zA-Z]+)@/g, function(s, key) {
    return escapeHtml ? api.dom.htmlEscape(data[key]) : data[key];
  });
};

// Simple HTML template
//
api.dom.templateHtml = function(tpl, data) {
  return api.dom.template(tpl, data, true);
};

// Cookie utils
//
api.cookie = {};

// Get cookie value by name
//
api.cookie.get = function(name) {
  var matches = document.cookie.match(new RegExp(
    '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
  ));
  return matches ? decodeURIComponent(matches[1]) : false;
};

// Set cookie value
//
api.cookie.set = function(name, value) {
  var cookie = name + '=' + escape(value) + '; path=/';
  document.cookie = cookie;
};

// Delete cookie value
//
api.cookie.delete = function(name) {
  api.cookie.set(name, null, { expires: -1 });
};

// RPC API
//
api.rpc = {};
api.rpc.tabId = 0;
api.rpc.tabKey = '';
api.rpc.masterTab = false;
api.rpc.masterTabId = 0;
api.rpc.masterTabKey = '';
api.rpc.heartbeatInterval = 2000;
api.rpc.heartbeatEvent = null;
api.rpc.initialized = false;
api.rpc.initializationCallbacks = [];
api.rpc.supportsLocalStorage = false;
api.rpc.onCallbacks = {};

// Add named event handler
//
api.rpc.on = function(name, callback) {
  var namedEvent = api.rpc.onCallbacks[name];
  if (!namedEvent) api.rpc.onCallbacks[name] = [callback];
  else namedEvent.push(callback);
};

// Emit named event
//
api.rpc.emit = function(name, data) {
  var namedEvent = api.rpc.onCallbacks[name];
  if (namedEvent) namedEvent.forEach(function(callback) {
    callback(name, data);
  });
};

// localStorage structure:
//   api.rpc.master = tabId e.g. 1
//   api.rpc.tab1 = Date.now() e.g. 1424185702490
//   api.rpc.tab2 = Date.now() e.g. 1424185704772
//   api.rpc.newtab = tabId (signal to master)
//   api.rpc.event = signal in format { name:s, data:d, time: Date.now() }
//
api.rpc.initializationWait = function(callback) {
  if (!api.rpc.initialized) api.rpc.initializationCallbacks.push(callback);
  else callback();
};

// Initialize RPC
//
api.rpc.initialize = function() {
  try {
    api.rpc.supportsLocalStorage = 'localStorage' in window && window.localStorage !== null;
  } catch(e) {
  }
  if (api.rpc.supportsLocalStorage) api.rpc.initializeConnection();
};

// Initialize RPC done
//
api.rpc.initializeDone = function() {
  api.rpc.heartbeatEvent = setInterval(api.rpc.listenHandler, api.rpc.heartbeatInterval);
  api.rpc.initialized = true;
  api.rpc.initializationCallbacks.forEach(function(callback) {
    callback();
  });
  api.rpc.initializationCallbacks = [];
};

// Get free browser tab
//
api.rpc.getFreeTab = function() {
  for (var id = 1;;id++) {
    if (typeof(localStorage['impress.rpc.tab' + id]) === 'undefined') return id;
  }
};

// Initialize RPC connection
//
api.rpc.initializeConnection = function() {
  if (!api.rpc.initialized) {
    api.rpc.tabId = api.rpc.getFreeTab();
    api.rpc.tabKey = 'impress.rpc.tab' + api.rpc.tabId;
    api.rpc.heartbeat();
    api.rpc.heartbeatEvent = setInterval(api.rpc.heartbeat, api.rpc.heartbeatInterval);
    localStorage['impress.rpc.newtab'] = api.rpc.tabId;
    global.addEventListener('storage', api.rpc.onStorageChange, false);
  }
  var master = localStorage['impress.rpc.master'];
  if (master) api.rpc.setMaster(master);
  else api.rpc.createMaster();
  api.rpc.initializeDone();
};

// Master tab heartbeat
//
api.rpc.heartbeat = function() {
  localStorage[api.rpc.tabKey] = Date.now();
  if (api.rpc.masterTab) api.rpc.checkTabs();
  else api.rpc.checkMaster();
};

// Check master tab
//
api.rpc.checkMaster = function() {
  var masterNow = parseInt(localStorage[api.rpc.masterTabKey], 10);
  if (Date.now() - masterNow > api.rpc.heartbeatInterval * 2) {
    var tabId, tabNow, key,
        keys = Object.keys(localStorage),
        maxId = 0,
        now = Date.now();
    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      if (key.indexOf('impress.rpc.tab') === 0) {
        tabId = parseInt(key.match(/\d+/)[0], 10);
        tabNow = parseInt(localStorage[key], 10);
        if (now - tabNow < api.rpc.heartbeatInterval * 2 && tabId > maxId) maxId = tabId;
      }
    }
    if (maxId === api.rpc.tabId) api.rpc.createMaster();
  }
};

// Check browser babs
//
api.rpc.checkTabs = function() {
  var tabNow, key, keys = Object.keys(localStorage);
  for (var i = 0; i < keys.length; i++) {
    key = keys[i];
    if (key !== api.rpc.tabKey && key.indexOf('impress.rpc.tab') === 0) {
      tabNow = parseInt(localStorage[key], 10);
      if (Date.now() - tabNow > api.rpc.heartbeatInterval * 2) {
        localStorage.removeItem(key);
      }
    }
  }
};

// Set master tab
//
api.rpc.setMaster = function(id) {
  api.rpc.masterTab = false;
  api.rpc.masterTabId = id;
  api.rpc.masterTabKey = 'impress.rpc.tab' + id;
};

// Create master tab
//
api.rpc.createMaster = function() {
  api.rpc.masterTab = true;
  api.rpc.masterTabId = api.rpc.tabId;
  api.rpc.masterTabKey = api.rpc.tabKey;
  localStorage['impress.rpc.master'] = api.rpc.tabId;
  api.rpc.initializeDone();
};

// RPC cross-tab communication using localstorage
//
api.rpc.onStorageChange = function(e) {
  if (e.key === 'impress.rpc.event') {
    var event = JSON.parse(e.newValue);
    api.rpc.emit(event.name, event.data);
  } else if (api.rpc.masterTab) {
    if (e.key === 'impress.rpc.newtab') api.rpc.heartbeat();
    else if (e.key === 'impress.rpc.master') console.log('WARNING: master collision');
  } else {
    if (e.key === 'impress.rpc.master') api.rpc.setMaster(e.newValue);
  }
};

// Emit cross-tab event
//
api.rpc.emitTabs = function(name, data) {
  localStorage['impress.rpc.event'] = JSON.stringify({ name: name, data: data, time: Date.now() });
};

// Make URL absolute
//
api.rpc.absoluteUrl = function(url) {
  if (url.charAt(0) === '/') {
    var site = window.location,
        absoluteUrl = 'ws';
    if (site.protocol === 'https:') absoluteUrl += 's';
    absoluteUrl += '://' + site.host + url;
    return absoluteUrl;
  } else return url;
};

// Create websocket instance with RPC wrapper
//
api.rpc.ws = function(url) {

  var rpc = {};

  var socket = new WebSocket(api.rpc.absoluteUrl(url));
  rpc.socket = socket;
  rpc.socket.nextMessageId = 0;
  rpc.socket.callCollection = {};

  socket.onopen = function() {
    console.log('Connection opened');
  };

  socket.onclose = function() {
    console.log('Connection closed');
  };

  socket.onmessage = function(event) {
    console.log('Message from server: ' + event.data);
    var data = JSON.parse(event.data);
    if (data.type === 'introspection') {
      var nName, mName, mPath, namespace, obj, parts, sub;
      for (nName in data.namespaces) {
        namespace = data.namespaces[nName];
        obj = {};
        rpc[nName] = obj;
        for (mName in namespace) {
          mPath = nName + '.' + mName;
          if (mName.indexOf('.') > -1) {
            parts = mName.split('.');
            sub = {};
            sub[parts[1]] = fn(mPath);
            obj[parts[0]] = sub;
          } else obj[mName] = fn(mPath);
        }
      }
    } else if (data.id) {
      var call = rpc.socket.callCollection[data.id];
      if (call) {
        if (typeof(call.callback) === 'function') call.callback(data.result);
      }
    }
  };

  function fn(path) {
    return function() {
      var parameters = [];
      Array.prototype.push.apply(parameters, arguments);
      var cb = parameters.pop();
      rpc.call('post', path, parameters, cb);
    };
  }

  rpc.close = function() {
    socket.close();
    rpc.socket = null;
  };

  rpc.call = function(method, name, parameters, callback) {
    rpc.socket.nextMessageId++;
    var data = {
      id: 'C' + rpc.socket.nextMessageId,
      type: 'call',
      method: 'get',
      name: name,
      data: parameters
    };
    data.callback = callback;
    rpc.socket.callCollection[data.id] = data;
    socket.send(JSON.stringify(data));
  };

  return rpc;

};

// Initialize RPC modile
//
api.rpc.initialize();

// Prepare AJAX interface stub
//
api.rpc.ajax = function(methods) { // params: { method: { get/post:url }, ... }

  function createMethod(apiStub, apiMethod) {
    if (apiMethod === 'introspect') {
      apiStub[apiMethod] = function(params, callback) {
        apiStub.request(apiMethod, params, function(err, data) {
          apiStub.init(data);
          callback(err, data);
        });
      };
    } else {
      apiStub[apiMethod] = function(params, callback) {
        apiStub.request(apiMethod, params, callback);
      };
    }
  }

  var apiStub = {};

  apiStub.request = function(apiMethod, params, callback) {
    var err = null, requestParams = this.methods[apiMethod];
    if (requestParams) {
      var httpMethod, url;
      if (requestParams.get ) { httpMethod = 'GET'; url = requestParams.get; }
      if (requestParams.post) { httpMethod = 'POST'; url = requestParams.post; }
      if (httpMethod) {
        api.rpc.request(httpMethod, url, params, true, callback);
        return;
      } else err = new Error('DataSource error: HTTP method is not specified');
    } else err = new Error('DataSource error: AJAX method is not specified');
    callback(err, null);
  };

  apiStub.init = function(methods) {
    apiStub.methods = methods;
    for (var apiMethod in apiStub.methods) createMethod(apiStub, apiMethod);
  };

  apiStub.init(methods);
  return apiStub;

};

// Data source abstract interface
//
// just abstract, see implementation below
// should be implemented methods:
//   read(query, callback)   return one record as object, callback(err, obj)
//   insert(obj, callback)   insert one record, callback(err) on done
//   update(obj, callback)   update one record, callback(err) on done
//   delete(query, callback) delete multiple records, callback(err) on done
// may be implemented methods:
//   introspect(params, callback) populates dataSource.methods with introspection metadata returning from server
//   metadata(params, callback)   populates dataSource.metadata with metadata from server
//   find(query, callback)        return multiple records as Array, callback(err, Array)

// AJAX data source interface
//
api.rpc.ajaxDataSource = function(methods) {
  var ds = api.rpc.ajax(methods);
  ds.read = function(query, callback) {
    ds.request('read', query, function(err, data) {
      // autocreate Record
      //   callback(err, api.rpc.record({ data: data }));
      //
      callback(err, data);
    });
  };
  return ds;
};

// Send HTTP request
//   method - HTTP verb (string)
//   url - request URL (string)
//   params - request parameters (hash, optional)
//   parseResponse - boolean flag to parse JSON (boolean, optional)
//   callback - function to call on response received
//
api.rpc.request = function(method, url, params, parseResponse, callback) {
  var key, data = [], value = '',
      req = new XMLHttpRequest();
  req.open(method, url, true);
  for (key in params) {
    if (!params.hasOwnProperty(key)) continue;
    value = params[key];
    if (typeof(value) !== 'string') value = JSON.stringify(value);
    data.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
  }
  data = data.join('&');
  req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      var err = null, res = req.responseText;
      if (req.status === 0 || req.status === 200) {
        if (parseResponse) {
          try {
            res = JSON.parse(res);
          } catch(e) {
            err = new Error('JSON parse code: ' + e);
          }
        }
      } else err = new Error('HTTP error code: ' + req.status);
      if (callback) callback(err, res);
    }
  };
  try {
    req.send(data);
  } catch(e) { }
};

// Send HTTP GET request
//
api.rpc.get = function(url, params, callback) {
  if (arguments.length === 2) {
    callback = params;
    params = {};
  }
  api.rpc.request('GET', url, params, true, callback);
};

// Send HTTP POST request
//
api.rpc.post = function(url, params, callback) {
  if (arguments.length === 2) {
    callback = params;
    params = {};
  }
  api.rpc.request('POST', url, params, true, callback);
};
