'use strict';

// Web Application Firewall for Impress Application Server

impress.firewall.ACCESS_ALLOWED = 0;
impress.firewall.ACCESS_DENIED = 1;
impress.firewall.ACCESS_LIMITED = 2;

// Define firewall objects
//
impress.firewall.ip = {};
impress.firewall.sid = {};
impress.firewall.host = {};
impress.firewall.url = {};
impress.firewall.app = {};
impress.firewall.srv = {};

// Register application in firewall
//
impress.firewall.addApplication = function(application) {

  if (!impress.config || !impress.config.scale.firewall.enabled) return;

  application.on('clientConnect', function(client) {
    var cfg = impress.config.scale.firewall.limits;
    if (cfg.ip) impress.firewall.ip.inc(client.ipInt);
    if (cfg.host) impress.firewall.host.inc(client.host);
    if (cfg.url) impress.firewall.url.inc(client.url);
    if (cfg.app) impress.firewall.app.inc(application.name);
    if (cfg.srv) impress.firewall.srv.inc(client.server.name);
  });

  application.on('clientSession', function(client) {
    var cfg = impress.config.scale.firewall.limits;
    if (cfg.sid) impress.firewall.sid.inc(client.sid);
  });

  application.on('clientDisconnect', function(client) {
    var cfg = impress.config.scale.firewall.limits;
    if (cfg.ip) impress.firewall.ip.dec(client.ipInt);
    if (cfg.sid && client.sid) impress.firewall.sid.dec(client.sid);
    if (cfg.host) impress.firewall.host.dec(client.host);
    if (cfg.url) impress.firewall.url.dec(client.url);
    if (cfg.app) impress.firewall.app.dec(application.name);
    if (cfg.srv) impress.firewall.srv.dec(client.server.name);
  });

};

// Check deny and limit restrictions
//
impress.firewall.check = function(client) {

  if (!impress.config.scale.firewall.enabled) return impress.firewall.ACCESS_ALLOWED;

  var cfg = impress.config.scale.firewall.limits;

  var allowed = true,
      limited = false;

  var key, limit;
  impress.firewall.objects.map(function(obj) {
    if (allowed && obj.denied) {
      key = obj.key(client);
      allowed = obj.denied.indexOf(key) === -1;
    }
    if (allowed && !limited && obj.limit) {
      key = obj.key(client);
      limit = cfg[obj.name];
      if (limit) limited = obj.limit[key] > limit;
    }
  });

  var code;
  if (!allowed) code = impress.firewall.ACCESS_DENIED;
  else if (limited) code = impress.firewall.ACCESS_LIMITED;
  else code = impress.firewall.ACCESS_ALLOWED;
  return code;

};

// Names of firewall objects
//
impress.firewall.objectNames = ['ip', 'sid', 'host', 'url', 'app', 'srv'];

// Array of firewall objects
//
impress.firewall.objects = impress.firewall.objectNames.map(function(objectName) {
  var obj = impress.firewall[objectName];
  obj.name = objectName;
  return obj;
});

// Keys for IP
//
impress.firewall.ip.key = function(client) {
  return client.ipInt;
};

// Key for SID
//
impress.firewall.sid.key = function(client) {
  return client.sid;
};

// Key for host
//
impress.firewall.host.key = function(client) {
  return client.host;
};

// Key for URL
//
impress.firewall.url.key = function(client) {
  return client.req.url;
};

// Key for application
//
impress.firewall.app.key = function(client) {
  return client.application.name;
};

// Key for server
//
impress.firewall.srv.key = function(client) {
  return client.server.name;
};

// Firewall functionality mixins
//
impress.firewall.mixins = {};

// Mixin deny() method for firewall.ip, firewall.host, etc.
//
impress.firewall.mixins.deny = function(item) {

  // Denied array
  //
  item.denied = [];

  // Deny IP address
  //
  item.deny = function(key) {
    if (item.denied.indexOf(key) < 0) item.denied.push(key);
  };

};

// Mixin inc/dec() methods for firewall.ip, firewall.host, etc.
//
impress.firewall.mixins.limit = function(item) {

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

// Mixin firewall functionality to firewall objects
//   TODO: hints for: items, mixins
//
impress.firewall.mx = function(items, mixins) {
  mixins.map(function(mixin) {
    items.map(mixin);
  });
};

impress.firewall.mx([
  impress.firewall.ip,
  impress.firewall.sid,
  impress.firewall.host
], [
  impress.firewall.mixins.deny,
  impress.firewall.mixins.limit
]);

impress.firewall.mx([
  impress.firewall.url,
  impress.firewall.app,
  impress.firewall.srv
], [
  impress.firewall.mixins.limit
]);
