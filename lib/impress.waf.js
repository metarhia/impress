'use strict';

// Web Application Firewall for Impress Application Server
//

impress.waf = {};

// Connection limits
//
impress.waf.limit = {
  server: {},
  host: {},
  ip: {},
  sid: {},
  url: {}
};

// Denied IPs and SIDs
//
impress.waf.deny = {
  ip: [],
  sid: []
};

// Deny IP address
//
impress.denyIP = function(ip) {
  if (impress.waf.deny.ip.indexOf(ip) < 0) {
    impress.waf.deny.ip.push(ip);
  }
};

// Deny IP address security identifier
//
impress.denySID = function(sid) {
  if (impress.waf.deny.sid.indexOf(sid) < 0) {
    impress.waf.deny.sid.push(sid);
  }
};

// Check deny and limit restrictions
//
impress.waf.check = function(client) {
  var application = client.application;
  var denied = false,
      limited = false;

  // STUB

  return !denied && !limited;
};
