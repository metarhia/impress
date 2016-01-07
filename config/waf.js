// Web Application Firewall config

module.exports = {
  enabled: false,
  limits: { // limit concurent connection count
    ip: 20, // per client ip
    sid: 10, // per user session
    host: 100, // per host name
    url: 50, // per url
    app: 200, // per application
    srv: 500 // per server port
  }
};
