'use strict';

// Web Application Firewall for Impress Application Server

const firewall = {};
api.firewall = firewall;

firewall.ACCESS_ALLOWED = 0;
firewall.ACCESS_DENIED = 1;
firewall.ACCESS_LIMITED = 2;

// Define firewall objects

firewall.ip = {};
firewall.sid = {};
firewall.host = {};
firewall.url = {};
firewall.app = {};
firewall.srv = {};

// Register application in firewall

firewall.addApplication = application => {
  const config = impress.config.sections.scale.firewall;
  if (!config.enabled) return;

  const { ip, sid, host, url, app, srv } = config.limits;

  application.on('clientConnect', client => {
    if (ip) firewall.ip.inc(client.ipInt);
    if (host) firewall.host.inc(client.host);
    if (url) firewall.url.inc(client.url);
    if (app) firewall.app.inc(application.name);
    if (srv) firewall.srv.inc(client.server.name);
  });

  application.on('clientSession', client => {
    if (sid) firewall.sid.inc(client.sid);
  });

  application.on('clientDisconnect', client => {
    if (ip) firewall.ip.dec(client.ipInt);
    if (sid && client.sid) firewall.sid.dec(client.sid);
    if (host) firewall.host.dec(client.host);
    if (url) firewall.url.dec(client.url);
    if (app) firewall.app.dec(application.name);
    if (srv) firewall.srv.dec(client.server.name);
  });
};

// Check deny and limit restrictions
firewall.check = client => {
  const config = impress.config.sections.scale.firewall;
  if (!config.enabled) return firewall.ACCESS_ALLOWED;
  const { limits } = config;

  let allowed = true;
  let limited = false;

  for (const obj of firewall.objects) {
    if (allowed && obj.denied) {
      const key = obj.key(client);
      allowed = !obj.denied.includes(key);
    }
    if (allowed && !limited && obj.limit) {
      const key = obj.key(client);
      const limit = limits[obj.name];
      if (limit) limited = obj.limit[key] > limit;
    }
  }

  let code;
  if (!allowed) code = firewall.ACCESS_DENIED;
  else if (limited) code = firewall.ACCESS_LIMITED;
  else code = firewall.ACCESS_ALLOWED;
  return code;
};

// Names of firewall objects
const OBJECT_NAMES = ['ip', 'sid', 'host', 'url', 'app', 'srv'];

// Array of firewall objects
firewall.objects = OBJECT_NAMES.map(objectName => {
  const obj = firewall[objectName];
  obj.name = objectName;
  return obj;
});

firewall.ip.key = client => client.ipInt;
firewall.sid.key = client => client.sid;
firewall.host.key = client => client.host;
firewall.url.key = client => client.req.url;
firewall.app.key = client => client.application.name;
firewall.srv.key = client => client.server.name;

firewall.mixins = {};

// Mixin deny() method for firewall.ip, firewall.host, etc.
firewall.mixins.deny = item => {
  item.denied = [];

  item.deny = key => {
    if (!item.denied.includes(key)) item.denied.push(key);
  };
};

// Mixin inc/dec() methods for firewall.ip, firewall.host, etc.
firewall.mixins.limit = item => {
  item.limit = {};

  item.inc = key => {
    const limit = item.limit[key];
    if (limit) item.limit[key] = limit + 1;
    else item.limit[key] = 1;
  };

  item.dec = key => {
    const limit = item.limit[key];
    if (limit === 1) delete item.limit[key];
    else item.limit[key] = limit - 1;
  };
};

firewall.mx = (items, mixins) => mixins.map(mixin => items.map(mixin));

firewall.mx(
  [firewall.ip, firewall.sid, firewall.host],
  [firewall.mixins.deny, firewall.mixins.limit]
);

firewall.mx(
  [firewall.url, firewall.app, firewall.srv],
  [firewall.mixins.limit]
);
