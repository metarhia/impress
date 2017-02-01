'use strict';

// Web Application Firewall for Impress Application Server

impress.firewall.ACCESS_ALLOWED = 0;
impress.firewall.ACCESS_DENIED = 1;
impress.firewall.ACCESS_LIMITED = 2;

// Define firewall objects

impress.firewall.ip = {};
impress.firewall.sid = {};
impress.firewall.host = {};
impress.firewall.url = {};
impress.firewall.app = {};
impress.firewall.srv = {};

// Register application in firewall

impress.firewall.addApplication = (application) => {

  if (!impress.config || !impress.config.scale.firewall.enabled) {
    return;
  }

  application.on('clientConnect', (client) => {
    const cfg = impress.config.scale.firewall.limits;
    if (cfg.ip) impress.firewall.ip.inc(client.ipInt);
    if (cfg.host) impress.firewall.host.inc(client.host);
    if (cfg.url) impress.firewall.url.inc(client.url);
    if (cfg.app) impress.firewall.app.inc(application.name);
    if (cfg.srv) impress.firewall.srv.inc(client.server.name);
  });

  application.on('clientSession', (client) => {
    const cfg = impress.config.scale.firewall.limits;
    if (cfg.sid) impress.firewall.sid.inc(client.sid);
  });

  application.on('clientDisconnect', (client) => {
    const cfg = impress.config.scale.firewall.limits;
    if (cfg.ip) impress.firewall.ip.dec(client.ipInt);
    if (cfg.sid && client.sid) impress.firewall.sid.dec(client.sid);
    if (cfg.host) impress.firewall.host.dec(client.host);
    if (cfg.url) impress.firewall.url.dec(client.url);
    if (cfg.app) impress.firewall.app.dec(application.name);
    if (cfg.srv) impress.firewall.srv.dec(client.server.name);
  });

};

impress.firewall.check = (
  client // Check deny and limit restrictions
) => {
  if (!impress.config.scale.firewall.enabled) {
    return impress.firewall.ACCESS_ALLOWED;
  }

  const cfg = impress.config.scale.firewall.limits;
  let allowed = true;
  let limited = false;

  let key, limit;
  impress.firewall.objects.map((obj) => {
    if (allowed && obj.denied) {
      key = obj.key(client);
      allowed = !obj.denied.includes(key);
    }
    if (allowed && !limited && obj.limit) {
      key = obj.key(client);
      limit = cfg[obj.name];
      if (limit) limited = obj.limit[key] > limit;
    }
  });

  let code;
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
impress.firewall.objects = impress.firewall.objectNames.map(
  (objectName) => {
    const obj = impress.firewall[objectName];
    obj.name = objectName;
    return obj;
  }
);

impress.firewall.ip.key = client => client.ipInt;
impress.firewall.sid.key = client => client.sid;
impress.firewall.host.key = client => client.host;
impress.firewall.url.key = client => client.req.url;
impress.firewall.app.key = client => client.application.name;
impress.firewall.srv.key = client => client.server.name;

impress.firewall.mixins = {};

impress.firewall.mixins.deny = (
  // Mixin deny() method for firewall.ip, firewall.host, etc.
  item
) => {

  item.denied = [];

  item.deny = (key) => {
    if (!item.denied.includes(key)) item.denied.push(key);
  };

};

impress.firewall.mixins.limit = (
  // Mixin inc/dec() methods for firewall.ip, firewall.host, etc.
  item
) => {

  item.limit = {};

  item.inc = (key) => {
    const limit = item.limit[key];
    if (limit) item.limit[key] = limit + 1;
    else item.limit[key] = 1;
  };

  item.dec = (key) => {
    const limit = item.limit[key];
    if (limit === 1) delete item.limit[key];
    else item.limit[key] = limit - 1;
  };

};

impress.firewall.mx = (items, mixins) => (
  mixins.map(mixin => items.map(mixin))
);

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
