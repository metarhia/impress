'use strict';

window.global = window;
global.api = {};
global.application = {};

api.common = {};

// Make URL absolute
api.common.absoluteUrl = url => {
  if (url.charAt(0) !== '/') return url;
  const site = window.location;
  let res = 'ws';
  if (site.protocol === 'https:') res += 's';
  res += '://' + site.host + url;
  return res;
};

// Return random number less then one argument random(100) or
// between two argumants random(50, 150)
api.common.random = function(min, max) {
  if (!max) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
};

// Simple EventEmitter implementation
api.events = {};

// EventEmitter
api.events.emitter = () => {

  const ee = {};
  ee.listeners = {};

  // Add named event handler
  ee.on = (name, callback) => {
    const namedEvent = ee.listeners[name];
    if (!namedEvent) ee.listeners[name] = [callback];
    else namedEvent.push(callback);
  };

  // Emit named event
  ee.emit = (name, data) => {
    const namedEvent = ee.listeners[name];
    if (namedEvent) namedEvent.forEach((callback) => {
      callback(data);
    });
  };

  return ee;

};

// DOM utilities

api.dom = {};

api.dom.html = document.documentElement ||
  document.getElementsByTagName('html')[0];

api.dom.head = document.head ||
  document.getElementsByTagName('head')[0];

api.dom.body = null;

api.dom.form = null;

// Get element by tag id
api.dom.id = id => document.getElementById(id);

if (document.getElementsByClassName) {
  api.dom.getElementsByClass = (classList, context) => (context || document)
    .getElementsByClassName(classList);
} else {
  api.dom.getElementsByClass = (classList, context) => {
    context = context || document;
    const list = context.getElementsByTagName('*');
    const classArray = classList.split(/\s+/);
    const result = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < classArray.length; j++) {
        if (list[i].className.search('\\b' + classArray[j] + '\\b') !== -1) {
          result.push(list[i]);
          break;
        }
      }
    }
    return result;
  };
}

// Add element class
api.dom.addClass = function(element, className) {
  element = api.dom.element(element);
  if (!element) return false;
  if (element.classList) {
    return element.classList.add(className);
  }
  const regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
  if (regex.test(element.className)) {
    element.className = (element.className + ' ' + className)
      .replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
    return element.className;
  }
};

// Remove element class
api.dom.removeClass = function(element, className) {
  element = api.dom.element(element);
  if (!element) return false;
  if (element.classList) {
    return element.classList.remove(className);
  }
  const regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
  element.className = element.className.replace(regex, '$1')
    .replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
};

// Check element class
api.dom.hasClass = function(element, className) {
  element = api.dom.element(element);
  if (!element) return false;
  if (element.classList) {
    return element.classList.contains(className);
  }
  return element.className.match(new RegExp('(^|\b)' + className + '($|\b)'));
};

// Add element event
api.dom.addEvent = function(element, event, fn) {
  element = api.dom.element(element);
  if (!element) return false;
  if (element.addEventListener) {
    return element.addEventListener(event, fn, false);
  } else if (element.attachEvent) {
    const callback = function() {
      fn.call(element);
    };
    return element.attachEvent('on' + event, callback);
  } else return false;
};

// Remove element event
api.dom.removeEvent = function(element, event, fn) {
  if (!fn) {
    fn = element;
    element = window;
  }
  element = api.dom.element(element);
  if (!element) return false;
  if (element.removeEventListener) {
    return element.removeEventListener(event, fn, false);
  } else if (element.detachEvent) {
    return element.detachEvent('on' + event, fn);
  } else return false;
};

// Events: 'load', 'unload', 'click', etc.
api.dom.on = function(event, element, fn) {
  if (!fn) {
    fn = element;
    element = window;
  }
  api.dom.addEvent(element, event, fn);
};

// Use element or selector
api.dom.element = function(element) {
  if (typeof element  !== 'string') {
    return element;
  }
  let result;
  try {
    //catching DOMException if element is not a valid selector
    result = document.querySelector(element);
  } catch (e) {
    result = null;
  }
  return result;
};

// Get page body reference
api.dom.on('load', () => {
  api.dom.body = document.body || document.getElementsByTagName('body')[0];
});

// fn(event) should terurn not empty string for confirmation dialog
api.dom.onBeforeUnload = function(fn) {
  api.dom.addEvent(api.dom, 'beforeunload', (event) => {
    const message = fn(event);
    if (typeof event === 'undefined') event = window.event;
    if (event) event.returnValue = message;
    return message;
  });
};

// Fire event
api.dom.fireEvent = function(element, eventName) {
  if (element.fireEvent) element.fireEvent('on' + eventName);
  else {
    const event = document.createEvent('Events');
    event.initEvent(eventName, true, false);
    element.dispatchEvent(event);
  }
};

// Enable element
api.dom.enable = function(element, flag) {
  if (flag) api.dom.removeClass(element, 'disabled');
  else api.dom.addClass(element, 'disabled');
};

// Visible element
api.dom.visible = function(element, flag) {
  if (flag) api.dom.show(element);
  else api.dom.hide(element);
};

// Toggle element
api.dom.toggle = function(element) {
  if (api.dom.hasClass(element, 'hidden')) api.dom.show(element);
  else api.dom.hide(element);
};

// Hide element
api.dom.hide = function(element) {
  if (!api.dom.hasClass(element, 'hidden')) {
    api.dom.addClass(element, 'hidden');
    element.setAttribute('_display', element.style.display);
    element.style.display = 'none';
  }
};

// Show element
api.dom.show = function(element) {
  if (api.dom.hasClass(element, 'hidden')) {
    api.dom.removeClass(element, 'hidden');
    element.style.display = element.getAttribute('_display') || '';
  }
};

// Load element content using AJAX
api.dom.load = function(url, element, callback) {
  element.innerHTML = '<div class="progress"></div>';
  api.ajax.get(url, {}, (err, res) => {
    element.innerHTML = res;
    if (callback) callback(err, res, element);
  });
};

// Center element
api.dom.alignCenter = function(element, context, styles) {
  let wrapper;
  const popupMargin = (element.style.margin.match(/\d+/) || [0])[0] || 0;

  if (api.dom.hasClass(element.parentNode, 'centering-wrapper')) {
    wrapper = element.parentNode;
  } else {
    wrapper = api.dom.wrapElement(element, 'centering-wrapper');
    if (styles) api.dom.setStyles(wrapper, styles);
    if (context && context.appendChild) {
      context.appendChild(wrapper);
    }
    api.dom.setStyles(wrapper, {
      'position': 'absolute',
      'z-index': '10',
      'text-align': 'center', // horizontal centering
      'overflow': 'hidden',
    });
    api.dom.setStyles(element, {
      // text-like behaviour for centering by line-height and vertical-align
      'display': 'inline-block',
      // include padding to height/width
      'box-sizing': 'border-box',
      // rewrite wrapper's value
      'text-align': 'initial',
      // rewrite wrapper's value
      'line-height': 'normal',
      // vertical centering
      'vertical-align': 'middle',
    });
  }
  api.dom.setStyles(wrapper, {
    'height': window.innerHeight + 'px',
    'width': window.innerWidth + 'px',
    'line-height': window.innerHeight + 'px' // vertical centering
  });
  api.dom.setStyles(element, {
    'max-width': (wrapper.offsetWidth - popupMargin * 2) + 'px',
    'max-height': (wrapper.offsetHeight - popupMargin * 2) + 'px'
  });

  return wrapper;
};

// Popup
api.dom.wrapElement = (element, classname) => {
  const wrapper = document.createElement('div');
  if (classname) api.dom.addClass(wrapper, classname);
  wrapper.appendChild(element);
  return wrapper;
};

api.dom.generateResizeHandler = (wrapper, popup, popupMargin) => () => {
  api.dom.setStyles(wrapper, {
    'height': window.innerHeight + 'px',
    'width': window.innerWidth + 'px',
    'line-height': window.innerHeight + 'px'
  });
  api.dom.setStyles(popup, {
    'max-width': (wrapper.offsetWidth - popupMargin * 2) + 'px',
    'max-height': (wrapper.offsetHeight - popupMargin * 2) + 'px'
  });
};

api.dom.generateClosePopup = (
  wrapper, content, resizeHandler, prevPlaceRefs
) => {
  const closePopup = function(event) {
    if (event.target !== wrapper && event.target !== closePopup.closeElement) {
      return true;
    }
    api.dom.setStyles(wrapper, { 'opacity': '0' });
    setTimeout(() => {
      if (prevPlaceRefs.previousParent) {
        prevPlaceRefs.previousParent.insertBefore(
          content.childNodes.item(0),
          prevPlaceRefs.previousSibling
        );
      }
      api.dom.body.removeChild(wrapper);
      api.dom.body.style.overflow = api.dom.body.bodyPrevOverflow;
    }, 500); // wait 0.5s for animation end
    api.dom.removeEvent(wrapper, 'click', closePopup);
    api.dom.removeEvent('resize', resizeHandler);
    event.stopImmediatePropagation();
    return false;
  };
  return closePopup;
};

function injectInnerContent(content, contentHolder) {
  const contentNode = api.dom.element(content);
  let prevPlaceRefs;
  if (contentNode) {
    prevPlaceRefs = {};
    prevPlaceRefs.previousParent = contentNode.parentNode;
    prevPlaceRefs.previousSibling = contentNode.nextElementSibling;
    contentHolder.appendChild(contentNode);
  } else if (typeof content === 'string') {
    contentHolder.innerHTML = content;
  }
  return prevPlaceRefs;
}

api.dom.popup = content => {
  const popupMargin = 10;
  const popupPadding = {
    x: api.dom.detectScrollbarWidth() || 20,
    y: 20,
  };

  const popup = document.createElement('div');
  const contentHolder = document.createElement('div');

  popup.appendChild(contentHolder);

  api.dom.setStyles(popup, {
    'background': 'white',
    'box-shadow': '0 0 15px #333',
    'min-width': '300px',
    'min-height': '100px',
    'overflow': 'auto',
    'margin': popupMargin + 'px',
    'padding': popupPadding.y + 'px ' + popupPadding.x + 'px'
  });
  const wrapper = api.dom.alignCenter(popup, api.dom.body, {
    'transition': 'opacity 0.5s',
    'background': 'rgba(0, 0, 0, 0.5)',
    'opacity': '0'
  });
  api.dom.setStyles(wrapper, {
    'opacity': '1'
  });
  api.dom.setStyles(contentHolder, {
    'display': 'inline-block'
  });
  api.dom.body.bodyPrevOverflow = api.dom.body.style.overflow;
  api.dom.setStyles(api.dom.body, {
    'overflow': 'hidden'
  });
  const prevPlaceRefs = injectInnerContent(content, contentHolder);
  const resizeHandler = api.dom.alignCenter.bind(null, popup);
  const closePopup = api.dom.generateClosePopup(
    wrapper, contentHolder, resizeHandler, prevPlaceRefs
  );
  api.dom.on('resize', resizeHandler);
  api.dom.on('click', wrapper, closePopup);
  return closePopup;
};

api.dom.detectScrollbarWidth = function() {
  const scrollDiv = document.createElement('div');
  api.dom.setStyles(scrollDiv, {
    'width': '100px',
    'height': '100px',
    'overflow': 'scroll',
    'position': 'absolute',
    'top': '-9999px'
  });
  api.dom.body.appendChild(scrollDiv);

  const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document.body.removeChild(scrollDiv);

  return scrollbarWidth;
};

function dashedToUpperCase(key) {
  return key.replace(/-(\w)/g, (match, p1) => p1.toUpperCase());
}

//transform CSS string to Object
const cssStringToObject = function(styles) {
  if (typeof styles === 'string') {
    const stylesStr = styles;
    styles = {};
    stylesStr.split(/\s*;\s*/).filter(Boolean).forEach((val) => {
      //split by first ':'
      const delimPos = val.search(/\s*:\s*/);
      const delimLength = val.match(/\s*:\s*/)[0].length;
      const key = val.substr(0, delimPos);
      val = val.substr(delimPos + delimLength);
      styles[key] = val; //storing to object
    });
  }
  return styles;
};

function extractPrefixedStyles(styleName) {
  styleName = styleName || styleName;
  const keys = [styleName];
  //adding vendor prefixes if needed
  for (const pref in api.dom.styleProps) {
    if (api.dom.styleProps[pref].indexOf(styleName) >= 0) {
      keys.push('-' + pref + '-' + styleName);
    }
  }
  return keys;
}

// Set given styles to element
api.dom.setStyles = function(element, styles) {
  styles = cssStringToObject(styles);
  if (typeof styles !== 'object') return false;

  for (const styleName in styles) {
    if (!styles[styleName]) break;
    const styleNames = extractPrefixedStyles(styleName);
    for (const dashedName in styleNames) {
      const key = dashedToUpperCase(styleNames[dashedName]);
      element.style[key] = styles[styleName];
    }
  }
  return true;
};

/* eslint-disable */
api.dom.styleProps = { //taken from Emmet lib - https://github.com/emmetio/emmet/blob/master/lib/resolver/css.js#L155
  'webkit': 'animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, appearance, backface-visibility, background-clip, background-composite, background-origin, background-size, border-fit, border-horizontal-spacing, border-image, border-vertical-spacing, box-align, box-direction, box-flex, box-flex-group, box-lines, box-ordinal-group, box-orient, box-pack, box-reflect, box-shadow, color-correction, column-break-after, column-break-before, column-break-inside, column-count, column-gap, column-rule-color, column-rule-style, column-rule-width, column-span, column-width, dashboard-region, font-smoothing, highlight, hyphenate-character, hyphenate-limit-after, hyphenate-limit-before, hyphens, line-box-contain, line-break, line-clamp, locale, margin-before-collapse, margin-after-collapse, marquee-direction, marquee-increment, marquee-repetition, marquee-style, mask-attachment, mask-box-image, mask-box-image-outset, mask-box-image-repeat, mask-box-image-slice, mask-box-image-source, mask-box-image-width, mask-clip, mask-composite, mask-image, mask-origin, mask-position, mask-repeat, mask-size, nbsp-mode, perspective, perspective-origin, rtl-ordering, text-combine, text-decorations-in-effect, text-emphasis-color, text-emphasis-position, text-emphasis-style, text-fill-color, text-orientation, text-security, text-stroke-color, text-stroke-width, transform, transition, transform-origin, transform-style, transition-delay, transition-duration, transition-property, transition-timing-function, user-drag, user-modify, user-select, writing-mode, svg-shadow, box-sizing, border-radius',
  'moz': 'animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, appearance, backface-visibility, background-inline-policy, binding, border-bottom-colors, border-image, border-left-colors, border-right-colors, border-top-colors, box-align, box-direction, box-flex, box-ordinal-group, box-orient, box-pack, box-shadow, box-sizing, column-count, column-gap, column-rule-color, column-rule-style, column-rule-width, column-width, float-edge, font-feature-settings, font-language-override, force-broken-image-icon, hyphens, image-region, orient, outline-radius-bottomleft, outline-radius-bottomright, outline-radius-topleft, outline-radius-topright, perspective, perspective-origin, stack-sizing, tab-size, text-blink, text-decoration-color, text-decoration-line, text-decoration-style, text-size-adjust, transform, transform-origin, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, user-focus, user-input, user-modify, user-select, window-shadow, background-clip, border-radius',
  'ms': 'accelerator, backface-visibility, background-position-x, background-position-y, behavior, block-progression, box-align, box-direction, box-flex, box-line-progression, box-lines, box-ordinal-group, box-orient, box-pack, content-zoom-boundary, content-zoom-boundary-max, content-zoom-boundary-min, content-zoom-chaining, content-zoom-snap, content-zoom-snap-points, content-zoom-snap-type, content-zooming, filter, flow-from, flow-into, font-feature-settings, grid-column, grid-column-align, grid-column-span, grid-columns, grid-layer, grid-row, grid-row-align, grid-row-span, grid-rows, high-contrast-adjust, hyphenate-limit-chars, hyphenate-limit-lines, hyphenate-limit-zone, hyphens, ime-mode, interpolation-mode, layout-flow, layout-grid, layout-grid-char, layout-grid-line, layout-grid-mode, layout-grid-type, line-break, overflow-style, perspective, perspective-origin, perspective-origin-x, perspective-origin-y, scroll-boundary, scroll-boundary-bottom, scroll-boundary-left, scroll-boundary-right, scroll-boundary-top, scroll-chaining, scroll-rails, scroll-snap-points-x, scroll-snap-points-y, scroll-snap-type, scroll-snap-x, scroll-snap-y, scrollbar-arrow-color, scrollbar-base-color, scrollbar-darkshadow-color, scrollbar-face-color, scrollbar-highlight-color, scrollbar-shadow-color, scrollbar-track-color, text-align-last, text-autospace, text-justify, text-kashida-space, text-overflow, text-size-adjust, text-underline-position, touch-action, transform, transform-origin, transform-origin-x, transform-origin-y, transform-origin-z, transform-style, transition, transition-delay, transition-duration, transition-property, transition-timing-function, user-select, word-break, wrap-flow, wrap-margin, wrap-through, writing-mode',
  'o': 'dashboard-region, animation, animation-delay, animation-direction, animation-duration, animation-fill-mode, animation-iteration-count, animation-name, animation-play-state, animation-timing-function, border-image, link, link-source, object-fit, object-position, tab-size, table-baseline, transform, transform-origin, transition, transition-delay, transition-duration, transition-property, transition-timing-function, accesskey, input-format, input-required, marquee-dir, marquee-loop, marquee-speed, marquee-style'
};
/* eslint-enable */

for (const i in api.dom.styleProps) {
  api.dom.styleProps[i] = api.dom.styleProps[i].split(/\s*,\s*/);
}

// Prepare AJAX namespace stub
// params: { method: { get/post:url }, ... }
api.ajax = methods => {

  const createMethod = (apiStub, apiMethod) => {
    if (apiMethod === 'introspect') {
      apiStub[apiMethod] = function(params, callback) {
        apiStub.request(apiMethod, params, (err, data) => {
          apiStub.init(data);
          callback(err, data);
        });
      };
    } else {
      apiStub[apiMethod] = function(params, callback) {
        apiStub.request(apiMethod, params, callback);
      };
    }
  };

  const apiStub = {};

  apiStub.request = function(apiMethod, params, callback) {
    let err = null;
    const requestParams = this.methods[apiMethod];
    if (requestParams) {
      let httpMethod;
      let url;
      if (requestParams.get) {
        httpMethod = 'GET';
        url = requestParams.get;
      }
      if (requestParams.post) {
        httpMethod = 'POST';
        url = requestParams.post;
      }
      if (httpMethod) {
        api.ajax.request(httpMethod, url, params, true, callback);
        return;
      } else {
        err = new Error('DataSource error: HTTP method is not specified');
      }
    } else {
      err = new Error('DataSource error: AJAX method is not specified');
    }
    callback(err, null);
  };

  apiStub.init = function(methods) {
    apiStub.methods = methods;
    for (const apiMethod in apiStub.methods) createMethod(apiStub, apiMethod);
  };

  apiStub.init(methods);
  return apiStub;

};

// Send HTTP request
//   method - HTTP verb (string)
//   url - request URL (string)
//   params - request parameters (hash, optional)
//   parseResponse - boolean flag to parse JSON (boolean, optional)
//   callback - function to call on response received
api.ajax.request = (method, url, params, parseResponse, callback) => {
  const data = [];
  let value = '';
  const req = new XMLHttpRequest();
  req.open(method, url, true);
  for (const key in params) {
    if (!params.hasOwnProperty(key)) continue;
    value = params[key];
    if (typeof value !== 'string') {
      value = JSON.stringify(value);
    }
    data.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
  }
  const payload = data.join('&');
  req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  req.onreadystatechange = () => {
    if (req.readyState === 4) {
      let err = null;
      let res = req.responseText;
      if (req.status === 0 || req.status === 200) {
        if (parseResponse) {
          try {
            res = JSON.parse(res);
          } catch (e) {
            err = new Error('JSON parse code: ' + e);
          }
        }
      } else {
        err = new Error('HTTP error code: ' + req.status);
      }
      if (callback) callback(err, res);
    }
  };
  try {
    req.send(payload);
  } catch (err) {
    console.error(err);
  }
};

// Send HTTP GET request
api.ajax.get = function(url, params, callback) {
  if (!callback) {
    callback = params;
    params = {};
  }
  api.ajax.request('GET', url, params, true, callback);
};

// Send HTTP POST request
api.ajax.post = function(url, params, callback) {
  if (!callback) {
    callback = params;
    params = {};
  }
  api.ajax.request('POST', url, params, true, callback);
};

// Create websocket instance
api.ws = url => {

  const ws = api.events.emitter();
  const socket = new WebSocket(api.common.absoluteUrl(url));

  ws.socket = socket;

  socket.onopen = () => {
    ws.emit('open');
  };

  socket.onclose = () => {
    ws.emit('close');
  };

  socket.onmessage = event => {
    ws.emit('message', event);
  };

  ws.close = () => {
    socket.close();
    ws.socket = null;
  };

  ws.send = data => {
    socket.send(data);
  };

  return ws;

};
