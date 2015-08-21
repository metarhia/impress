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
//   ip - string IP address
//
impress.denyIP = function(ip) {
  var adr = api.impress.ip2int(ip);
  if (impress.waf.deny.ip.indexOf(adr) < 0) {
    impress.waf.deny.ip.push(adr);
  }
};

// Deny SID (security identifier)
//   sid - string security identifier
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

  var adr = api.impress.ip2int(client.ip),
      denied = impress.waf.deny.ip.indexOf(adr) !== -1,
      limited = false; // stub

  return !denied && !limited;
};
