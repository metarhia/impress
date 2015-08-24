'use strict';

// Web Application Firewall for Impress Application Server
//
impress.waf = {};

impress.waf.ACCESS_ALLOWED = 0;
impress.waf.ACCESS_DENIED = 1;
impress.waf.ACCESS_LIMITED = 2;

// Check deny and limit restrictions
//
impress.waf.check = function(client) {
  var application = client.application;

  var code = impress.waf.ACCESS_ALLOWED;

  if (impress.waf.ip.denied.indexOf(client.ipInt) !== -1) {
    code = impress.waf.ACCESS_DENIED;
  } else if (false) {
    code = impress.waf.ACCESS_LIMITED;
  }

  return code;
};

// WAF functionality mixins
//
impress.waf.mixins = {};

// Mixin deny() method for waf.ip, waf.host, etc.
//
impress.waf.mixins.deny = function(item) {

  // Denied array
  //
  item.denied = [];

  // Deny IP address
  //
  item.deny = function(key) {
    if (item.denied.indexOf(key) < 0) item.denied.push(key);
  };

};

// Mixin inc/dec() methods for waf.ip, waf.host, etc.
//
impress.waf.mixins.limit = function(item) {

  // Limit counters
  //
  item.limit = {};

  // Inc counter for item
  //
  item.inc = function(key) {
    var limit = item.limit[key];
    if (limit) item.limit[key] = limit + 1;
    else item.limit[key] = 1;
  };

  // Dec counter for item
  //
  item.dec = function(key) {
    var limit = item.limit[key];
    if (limit === 1) delete item.limit[key];
    else item.limit[key] = limit - 1;
  };

};

// Mixin WAF functionality to WAF objects
//
impress.waf.mixin = function(items, mixins) {
  mixins.map(function(mixin) {
    items.map(mixin);
  });
};

// Define WAF objects
//
impress.waf.ip = {};
impress.waf.sid = {};
impress.waf.host = {};
impress.waf.url = {};
impress.waf.application = {};
impress.waf.server = {};

impress.waf.mixin([
  impress.waf.ip,
  impress.waf.sid,
  impress.waf.host
], [
  impress.waf.mixins.deny,
  impress.waf.mixins.limit
]);

impress.waf.mixin([
  impress.waf.url,
  impress.waf.application,
  impress.waf.server
], [
  impress.waf.mixins.limit
]);
