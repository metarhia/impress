module.exports = function(client, callback) {

    var npmList = [ 'mongodb', 'memcached', 'mysql', 'mysql-utilities', 'nodemailer', 'geoip-lite', 'websocket' ],
      npmChecked = client.fields.npmChecked.split(',');

  api.npm.load(npm.config, function (err) {
    api.npm.on("log", function (message) {
      console.log(message);
    });
    for (var i = 0; i < npmList.length; i++) {
      var lib, npmName = npmList[i];
      try {
        lib = require(npmName);
      } catch (err) {}
      if (!lib && npmChecked.indexOf(npmName) != -1) {
        api.npm.commands.install([npmName], function (err, data) {
          if (err) console.log('npm error'.red);
        });
      }
    }
  });

  callback();

}