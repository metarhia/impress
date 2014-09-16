module.exports = function(client, callback) {

    var npmList = [ 'mongodb', 'memcached', 'mysql', 'mysql-utilities', 'nodemailer', 'geoip-lite', 'websocket' ],
      npmChecks = {};

  for (var i = 0; i < npmList.length; i++) {
    var lib, npmName = npmList[i];
    try {
      lib = require(npmName);
    } catch (err) {}
    npmChecks[npmName] = lib ? 'checked' : '';
  }

  callback({ npm: npmChecks });

}