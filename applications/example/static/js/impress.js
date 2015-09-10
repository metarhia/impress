'use strict';

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

api.dom.fixLinks = function(persist) {
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

// DOM utils

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

api.dom.addClass = function(element, className) {
  var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
  if (regex.test(element.className)) {
    element.className = (element.className + ' ' + className).replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
    return element.className;
  }
};

api.dom.removeClass = function(element, className) {
  var regex = new RegExp('(^|\\s)' + className + '(\\s|$)', 'g');
  element.className = element.className.replace(regex, '$1').replace(/\s+/g, ' ').replace(/(^ | $)/g, '');
};

api.dom.hasClass = function(element, className) {
  element = api.dom.element(element);
  return element.className.match(new RegExp('(^|\b)' + className + '($|\b)'));
};

api.dom.toggleClass = function(element, className) {
  element = api.dom.element(element);
  if (api.dom.hasClass(element, className)) api.dom.removeClass(element, className);
  else api.dom.addClass(element, className);
};

api.dom.insertAfter = function(parent, node, referenceNode) {
  parent.insertBefore(node, referenceNode.nextSibling);
};

api.dom.getFrameDocument = function(fname) {
  if (platform.IE) return frames[fname].document;
  else return api.dom.id(fname).contentDocument; 
};

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

api.dom.element = function(element) {
  if (typeof(element) === 'string') return document.querySelector(element);
  else return element;
};

api.dom.on('load', function() {
  api.dom.body = document.body || document.getElementsByTagName('body')[0];
});

// fn(event) should terurn not empty string for confirmation dialog
api.dom.onBeforeUnload = function(fn) {
  api.dom.addEvent(api.dom, 'beforeunload', function(event) {
    var message = fn(event);
    if (typeof(event) === 'undefined') event = window.event;
    if (event) event.returnValue = message;
    return message;
  });
};

// --------------------------------------------------------------

api.dom.enable = function(element, flag) {
  if (flag) api.dom.removeClass(element, 'disabled');
  else api.dom.addClass(element, 'disabled');
};

api.dom.visible = function(element, flag) {
  if (flag) api.dom.show();
  else api.dom.hide();
};

api.dom.reload = function(url, callback) {
  var panel = this;
  panel/*scroller('remove').*/.empty().html('<div class="progress"></div>').load(url, function() {
    //panel.removeAttr('style').scroller('y');
    //panel.scroller('y');
    if (api.dom.platform.iOS) panel.width(panel.width()-1);
    $('a.default', panel).click();
    if (callback) callback.call(panel);
    //$('textarea').autoResize({ animateDuration: 300, extraSpace: 20 }).trigger('change');
    //refreshControls();
  });
};

// $.ajaxSetup({cache: false});

api.dom.alignCenter = function(element) {
  element = api.dom.element(element);
  var marginLeft = Math.max(40, parseInt($(window).width()/2 - $(element).width()/2, 10)) + 'px';
  var marginTop = Math.max(40, parseInt($(window).height()/2 - $(element).height()/2, 10)) + 'px';
  return $(element).css({ 'margin-left': marginLeft, 'margin-top': marginTop });
};

api.dom.togglePopup = function(element) {
  element = api.dom.element(element);
  if ($('#popup').hasClass('hidden')) {
    if (api.dom.platform.IE) {
      $('#darken').height($(document).height()).toggleClass('hidden');
    } else {
      $('#darken').height($(document).height()).toggleClass('hidden').fadeTo('slow', 0.5).click(function(event) {
        event.stopPropagation();
        var form = document.querySelector('#popup .form');
        if (form) api.dom.togglePopup(form);
      });
    }
    $(element).appendTo('#popup');
    api.dom.alignCenter('#popup');
    api.dom.toggleClass('#popup', 'hidden');
    $('form :input:visible:enabled:first', element).focus();
  } else {
    api.dom.toggleClass('#darken', 'hidden');
    $('#darken').removeAttr('style');
    api.dom.toggleClass('#popup', 'hidden');
    $('#popup').removeAttr('style');
    $('#popup .form').appendTo('#forms');
  }
};

api.dom.closeForm = function() {
  api.dom.form = document.querySelector('#popup .form');
  var $inputs = $('form select:input', api.dom.form);
  $inputs.each(function() {
    //alert($(this).val());
    $(this).combobox('destroy');
  });
  if (api.dom.form) api.dom.togglePopup(api.dom.form);
};

//$(document).keydown(function(event) {
//  if (event.keyCode === 27) closeForm();
//  else if (event.keyCode === 13) $('#popup .form .save').trigger('click');
//});

//$(document).on('click', '#popup .cancel', function(event) {
//  closeForm();
//  return false;
//});

// --- Confirmation ---

// Buttons: ['Yes', 'No', 'Ok', 'Cancel']
api.dom.confirmation = function(title, message, eventYes, buttons) {
  var form = $('#formConfirmation');
  if (typeof(buttons) === 'undefined') buttons = ['Cancel', 'Yes'];
  $('.header', form).html(title);
  $('.message', form).html('<br/>' + message + '<br/><br/>');
  api.dom.confirmation.formConfirmationYes = eventYes;
  $('#formConfirmationYes').visible(buttons.indexOf('Yes') > -1);
  $('#formConfirmationOk').visible(buttons.indexOf('Ok') > -1);
  $('#formConfirmationNo').visible(buttons.indexOf('No') > -1);
  $('#formConfirmationCancel').visible(buttons.indexOf('Cancel') > -1);
  form.togglePopup();
};

$(document).on('click', '#formConfirmation .button.save', function(event) {
  if (typeof(api.dom.confirmation.formConfirmationYes) === 'function') {
    api.dom.confirmation.formConfirmationYes();
  }
  api.dom.confirmation.formConfirmationYes = null;
  closeForm();
  return false;
});

// --- Input ---

api.dom.input = function(title, prompt, defaultValue, eventOk) {
  var form = $('#formInput');
  $('.header', form).html(title);
  //$('.message', form).html(message);
  $('.field .label', form).html(prompt);
  //if (defaultValue)
  $('#formInputValue').val(defaultValue);
  api.dom.input.formInputOk = eventOk;
  form.togglePopup();
};

// Copypaste utils

// Call disableSelection on page load with element to disable or without parameters to disable selection in whole page
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

api.dom.disableContextMenu = function(target) {
  target = target || api.dom.html;
  api.dom.addEvent(document, 'contextmenu', function(event) {
    event = event || window.event;
    if (document.addEventListener) event.preventDefault();
    else event.returnValue = false;
  });
};

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

// Cookie utils
api.cookie = {};

api.cookie.get = function(name) {
  var matches = document.cookie.match(new RegExp(
    '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
  ));
  return matches ? decodeURIComponent(matches[1]) : false;
};

api.cookie.set = function(name, value) {
  var cookie = name + '=' + escape(value) + '; path=/';
  document.cookie = cookie;
};

api.cookie.delete = function(name) {
  api.cookie.set(name, null, { expires: -1 });
};

// RPC API

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

api.rpc.on = function(name, callback) {
  var namedEvent = api.rpc.onCallbacks[name];
  if (!namedEvent) api.rpc.onCallbacks[name] = [callback];
  else namedEvent.push(callback);
};

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

api.rpc.initializationWait = function(callback) {
  if (!api.rpc.initialized) api.rpc.initializationCallbacks.push(callback);
  else callback();
};

api.rpc.initialize = function() {
  try {
    api.rpc.supportsLocalStorage = 'localStorage' in window && window.localStorage !== null;
  } catch(e) {
  }
  if (api.rpc.supportsLocalStorage) api.rpc.initializeConnection();
};

api.rpc.initializeDone = function() {
  api.rpc.heartbeatEvent = setInterval(api.rpc.listenHandler, api.rpc.heartbeatInterval);
  api.rpc.initialized = true;
  api.rpc.initializationCallbacks.forEach(function(callback) {
    callback();
  });
  api.rpc.initializationCallbacks = [];
};

api.rpc.getFreeTab = function() {
  for (var id = 1;;id++) {
    if (typeof(localStorage['impress.rpc.tab' + id]) === 'undefined') return id;
  }
};

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

api.rpc.heartbeat = function() {
  localStorage[api.rpc.tabKey] = Date.now();
  if (api.rpc.masterTab) api.rpc.checkTabs();
  else api.rpc.checkMaster();
};

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

api.rpc.setMaster = function(id) {
  api.rpc.masterTab = false;
  api.rpc.masterTabId = id;
  api.rpc.masterTabKey = 'impress.rpc.tab' + id;
};

api.rpc.createMaster = function() {
  api.rpc.masterTab = true;
  api.rpc.masterTabId = api.rpc.tabId;
  api.rpc.masterTabKey = api.rpc.tabKey;
  localStorage['impress.rpc.master'] = api.rpc.tabId;
  api.rpc.initializeDone();
};

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

api.rpc.emitTabs = function(name, data) {
  localStorage['impress.rpc.event'] = JSON.stringify({ name: name, data: data, time: Date.now() });
};

api.rpc.absoluteUrl = function(url) {
  if (url.charAt(0) === '/') {
    var site = window.location,
        absoluteUrl = 'ws';
    if (site.protocol === 'https:') absoluteUrl += 's';
    absoluteUrl += '://' + site.host + url;
    return absoluteUrl;
  } else return url;
};

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

api.rpc.initialize();

// WCL API
//
api.wcl = {};
api.wcl.dataSets = {};
api.wcl.containers = {};
api.wcl.components = {};
api.wcl.utils = {};

api.wcl.AjaxAPI = function(methods) { // params: { method: { get/post:url }, ... }
  var api = {};
  api.request = function(apiMethod, params, callback) {
    var err = null, requestParams = this.methods[apiMethod];
    if (requestParams) {
      var httpMethod, url;
      if (requestParams.get ) { httpMethod = 'GET'; url = requestParams.get; }
      if (requestParams.post) { httpMethod = 'POST'; url = requestParams.post; }
      if (httpMethod) {
        api.wcl.request(httpMethod, url, params, true, callback);
        return;
      } else err = new Error('DataSource error: HTTP method is not specified');
    } else err = new Error('DataSource error: AJAX method is not specified');
    callback(err, null);
  };
  api.init = function(methods) {
    api.methods = methods;
    var method;
    for (method in api.methods) {
      (function() {
        var apiMethod = method;
        if (apiMethod === 'introspect') api[apiMethod] = function(params, callback) {
          api.request(apiMethod, params, function(err, data) {
            api.init(data);
            callback(err, data);
          });
        }; else api[apiMethod] = function(params, callback) {
          api.request(apiMethod, params, callback);
        };
      } ());
    }
  };
  api.init(methods);
  return api;
};

api.wcl.DataSource = function(methods) {
  // just abstract, see implementation below
  // should be implemented methods:
  //   read(query, callback)   return one record as object, callback(err, obj)
  //   insert(obj, callback)   insert one record, callback(err) on done
  //   update(obj, callback)   update one record, callback(err) on done
  //   delete(query, callback) delete multiple records, callback(err) on done
  // may be implemented methods:
  //   introspect(params, callback) populates DataSource.methods with introspection metadata returning from server
  //   metadata(params, callback)   populates DataSource.metadata with metadata from server
  //   find(query, callback)        return multiple records as Array, callback(err, Array)
};

api.wcl.AjaxDataSource = function(methods) {
  var ds = api.wcl.AjaxAPI(methods);
  ds.read = function(query, callback) {
    ds.request('read', query, function(err, data) {
      // TODO: autocreate Record
      //   callback(err, api.wcl.Record({ data:data }));
      //
      callback(err, data);
    });
  };
  return ds;
};

api.wcl.MemoryDataSource = function(params) { // { data:Hash, metadata:Hash }
  var ds = {};
  ds.data = params.data;
  ds.metadata = params.metadata;
  ds.each = function(params, callback) {
    var d, key, match;
    for (var i = 0; i < ds.data.length; i++) {
      d = ds.data[i];
      match = true;
      for (key in params) match = match && (d[key] === params[key]);
      if (match && callback(i)) return;
    }
  };
  ds.read = function(params, callback) {
    var data = ds.data;
    ds.each(params, function(key) { callback(null, data[key]); return true; });
    callback(new Error('Record not found'), null);
  };
  ds.insert = function(params, callback) {
    ds.data.push(params);
    callback();
  };
  ds.update = function(params, callback) {
    var data = ds.data;
    ds.each(params, function(key) { data[key] = params; return true; });
    callback();
  };
  ds.delete = function(params, callback) {
    var data = ds.data;
    ds.each(params, function(key) { delete data[key]; });
    callback();
  };
  ds.find = function(params, callback) {
    var data = ds.data, result = [];
    ds.each(params, function(key) { result.push(data[key]); });
    callback(null, result);
  };
  return ds;
};

api.wcl.DataObject = function(params) {
  // params: { data: Value, metadata: Hash, record: Record }
  //
  var obj = {};
  obj.data = params.data;
  obj.fields = {};
  obj.type = typeof(obj.data); // Object, String, Array, Number
  obj.bindings = [];
  obj.modified = false;

  if (obj.data !== null && typeof(obj.data) === 'object') {
    var key;
    for (key in obj.data) obj.fields[key] = api.wcl.DataObject({ data:obj.data[key] });
  }

  obj.value = function(value, forceUpdate) {
    if (value !== undefined) {
      if ((field.data !== value) || forceUpdate) {
        //console.log('Field change ' + field.data + ' to ' + value);
        field.data = value;
        if (!forceUpdate) {
          field.modified = true;
          field.dataSet.record.modified = true;
        }
        if (field.dataSet.updateCount === 0) {
          for (var i = 0; i < field.bindings.length; i++) field.bindings[i].value(value);
        }
      }
    } else return field.data;
  };
  return obj;
};

api.wcl.Record = function(params) {
  // implemented params: { data: Hash, metadata: Hash, dataSet: DataSet }
  // not implemented:    { table: Table, source: DataSource }
  //
  var record = {};
  record.fields = {};
  record.dataSet = params.dataSet;
  record.modified = false;
  record.assign = function(data, metadata, preventUpdateAll) {
    var fieldName;
    for (fieldName in data) {
      if (record.fields[fieldName]) {
        record.fields[fieldName].value(data[fieldName]);
        record.fields[fieldName].modified = false;
      } else record.fields[fieldName] = api.wcl.Field({
        data: data[fieldName],
        metadata: metadata ? metadata[fieldName] : null,
        dataSet: record.dataSet
      });
    }
    if (!preventUpdateAll) record.updateAll();
    record.modified = false;
  };
  record.each = function(callback) { // callback(fieldName, field)
    var fieldName;
    for (fieldName in record.fields) callback(fieldName, record.fields[fieldName]);
  };
  record.toObject = function() {
    var result = {};
    record.each(function(fieldName, field) { result[fieldName] = field.value(); });
    return result;
  };
  record.toString = function() {
    return JSON.stringify(record.toObject());
  };
  record.deltaObject = function() {
    var result = {};
    record.each(function(fieldName, field) {
      if (field.modified) result[fieldName] = field.value();
    });
    return result;
  };
  record.deltaString = function() {
    return JSON.stringify(record.deltaObject());
  };
  record.commit = function() {
    if (record.modified) {
      var recNo = record.dataSet.currentRecord,
          data = record.dataSet.memory.data[recNo];
      record.each(function(fieldName, field) {
        if (field.modified) data[fieldName] = field.value();
        field.modified = false;
      });
      record.modified = false;
    }
  };
  record.rollback = function() {
    if (record.modified) {
      var recNo = record.dataSet.currentRecord,
          data = record.dataSet.memory.data[recNo];
      record.assign(data);
    }
  };
  record.updateAll = function() {
    record.each(function(fieldName, field) { field.value(field.data, true); });
  };
  if (params.data) record.assign(params.data, params.metadata, true);
  return record;
};

api.wcl.DataSet = function(params) {
  // implemented params: { data: Hash, metadata: Hash }
  // not implemented:    { source: DataSource }
  //
  var dataSet = {};
  dataSet.memory = api.wcl.MemoryDataSource({ data:[] });
  dataSet.metadata = params.metadata;
  dataSet.source = params.source;
  dataSet.record = null;
  dataSet.recordCount = 0;
  dataSet.currentRecord = -1;
  dataSet.modified = false;
  dataSet.query = function(params, callback) {
    dataSet.source.find(params, function(err, data) {
      dataSet.assign(data);
      callback();
    });
  };
  dataSet.toString = function() {
    return JSON.stringify(dataSet.memory.data);
  };
  dataSet.assign = function(data) {
    if (data) {
      dataSet.memory.data = data;
      dataSet.recordCount = dataSet.memory.data.length;
      dataSet.currentRecord = -1;
      dataSet.first();
    }
  };
  dataSet.move = function(recNo) {
    if (recNo !== dataSet.currentRecord && recNo >= 0 && recNo < dataSet.recordCount) {
      var data = dataSet.memory.data[recNo];
      if (dataSet.record) {
        if (dataSet.record.modified) dataSet.record.commit();
        dataSet.record.assign(data);
      } else dataSet.record = api.wcl.Record({ data: data, dataSet: dataSet });
      dataSet.currentRecord = recNo;
    }
  };
  dataSet.first = function() { dataSet.move(0); };
  dataSet.next  = function() { dataSet.move(dataSet.currentRecord + 1); };
  dataSet.prev  = function() { dataSet.move(dataSet.currentRecord - 1); };
  dataSet.last  = function() { dataSet.move(dataSet.recordCount - 1); };
  //
  dataSet.updateCount = 0;
  dataSet.beginUpdate = function() {
    dataSet.updateCount++;
  };
  dataSet.endUpdate = function() {
    dataSet.updateCount--;
    if (dataSet.updateCount <= 0) {
      dataSet.updateCount = 0;
      dataSet.updateAll();
    }
  };
  dataSet.updateAll = function() {
    dataSet.record.updateAll();
  };
  dataSet.commit = function() {
  };
  dataSet.rollback = function() {
  };

  dataSet.assign(params.data);
  return dataSet;
};

// Nonvisual or visual component
//
api.wcl.components.Component = function(obj) {
};

// Visual component
api.wcl.components.Control = function(obj) {
  api.wcl.components.Component(obj);
  //
};

api.wcl.components.Iterator = function(obj) {
  api.wcl.components.Control(obj);
  //
};

api.wcl.components.Container = function(obj) {
  api.wcl.components.Control(obj);
  obj.wcl.controls = {};
  if (obj.wcl.dataWcl.dataSet) obj.wcl.dataSet = global[obj.wcl.dataWcl.dataSet];
};

api.wcl.components.FieldControl = function(obj) {
  api.wcl.components.Control(obj);
  // obj.wcl.dataSet - autoassigned on load
  obj.wcl.field = obj.wcl.dataSet.record.fields[obj.wcl.dataWcl.field];
  obj.wcl.field.bindings.push(obj);
};

api.wcl.components.Label = function(obj) {
  api.wcl.components.FieldControl(obj);
  obj.innerHTML = '<span>' + obj.wcl.field.data + '</span>';
  obj.value = function(value) {
    if (value === undefined) return obj.textContent;
    else if (obj.textContent !== value) obj.textContent = value;
  };
};

api.wcl.components.Edit = function(obj) {
  api.wcl.components.FieldControl(obj);
  obj.innerHTML = '<input type="text" name="email">';
  var edit = obj.children[0];
  edit.value = obj.wcl.field.data;
  edit.addEventListener('keyup', function(e) {
    obj.wcl.field.value(this.value);
  }, false);
  obj.value = function(value) {
    var edit = this.children[0];
    if (value === undefined) return edit.value;
    else if (edit.value !== value) edit.value = value;
  };
};

api.wcl.components.Button = function(obj) {
  api.wcl.components.Control(obj);
  obj.innerHTML = '<a href="" onclick=""></a>';
  var edit = obj.children[0];
  edit.value = obj.wcl.field.data;
  edit.addEventListener('click', function(e) {
    console.log('button clicked');
  }, false);
};

api.wcl.components.Table = function(obj) {
  api.wcl.components.Control(obj);
  //
};

// TODO: autobind on load
//
api.wcl.bind = function(params) { // { record:Record, container:element }
  params.container.wcl = { record: params.record };
  var dataWcl, element, component, elements = params.container.getElementsByTagName('div');
  for (var i = 0; i < elements.length; i++) {
    element = elements[i];
    dataWcl = element.getAttribute('data-wcl');
    if (dataWcl) {
      element.wcl = { dataWcl: api.wcl.parse(dataWcl), record: params.record };
      if (element.wcl.dataWcl.control) {
        component = api.wcl.components[element.wcl.dataWcl.control];
        global[element.wcl.dataWcl.name] = element;
        component(element);
      }
    }
  }
};

api.wcl.parse = function(json) {
  var result;
  eval('result = new Object(' + json + ')');
  return result;
};

api.wcl.htmlEscape = function(content) {
  return content.replace(/[&<>"'\/]/g,function(char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[char]); });
};

api.wcl.template = function(tpl, data, escapeHtml) {
  return tpl.replace(/@([\-\.0-9a-zA-Z]+)@/g, function(s, key) {
    return escapeHtml ? api.wcl.htmlEscape(data[key]) : data[key];
  });
};

api.wcl.templateHtml = function(tpl, data) {
  return api.wcl.template(tpl, data, true);
};

api.wcl.request = function(method, url, params, parseResponse, callback) {
  var key, req = new XMLHttpRequest(), data = [], value = '';
  req.open(method, url, true);
  for (key in params) {
    if (!params.hasOwnProperty(key)) continue;
    value = params[key];
    if (typeof(value) !== 'string') value = JSON.stringify(value);
    data.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
  }
  data = data.join('&');
  req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  req.setRequestHeader('Content-length', data.length);
  req.setRequestHeader('Connection', 'close');
  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      var err = null, res = req.responseText;
      if (req.status === 0 || req.status === 200) {
        if (parseResponse) {
          try { res = JSON.parse(res); }
          catch(e) { err = new Error('JSON parse code: ' + e); }
        }
      } else err = new Error('HTTP error code: ' + req.status);
      callback(err, res);
    }
  };
  try { req.send(data); }
  catch(e) { }
};

api.wcl.get = function(url, params, callback) {
  api.wcl.request('GET', url, params, true, callback);
};

api.wcl.post = function(url, params, callback) {
  api.wcl.request('POST', url, params, true, callback);
};

api.wcl.autoInitialization = function() {
  api.wcl.body = document.body || document.getElementsByTagName('body')[0];
  var container, containerName, element, dataWcl, component,
      elements = api.wcl.body.getElementsByTagName('div');
  for (var i = 0; i < elements.length; i++) {
    element = elements[i];
    dataWcl = element.getAttribute('data-wcl');
    if (dataWcl) {
      element.wcl = { dataWcl: api.wcl.parse(dataWcl) }; // record: params.record
      if (element.wcl.dataWcl.control === 'Container') api.wcl.containers[dataWcl.name] = element;
    }
  }
  for (containerName in api.wcl.containers) {
    container = api.wcl.containers[containerName];
    elements = container.getElementsByTagName('div');
    global[container.wcl.dataWcl.name] = container;
    api.wcl.components.Container(container);
    for (var j = 0; j < elements.length; j++) {
      element = elements[j];
      if (element.wcl.dataWcl.control) {
        component = api.wcl.components[element.wcl.dataWcl.control];
        container.wcl.controls[element.wcl.dataWcl.name] = element;
        container[element.wcl.dataWcl.name] = element;
        element.wcl.container = container;
        element.wcl.dataSet = container.wcl.dataSet;
        component(element);
      }
    }
  }
};

//addEvent(global, 'load', api.wcl.autoInitialization);
