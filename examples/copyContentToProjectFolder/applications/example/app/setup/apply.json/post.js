module.exports = function(client, callback) {

    var npmList = [ 'mongodb', 'memcached', 'mysql', 'mysql-utilities', 'nodemailer', 'geoip-lite', 'websocket' ],
    	npmChecked = client.fields.npmChecked.split(',');

	npm.load(npm.config, function (err) {
		npm.on("log", function (message) {
			console.log(message);
		});
		for (var i = 0; i < npmList.length; i++) {
			var npmName = npmList[i],
				lib = require(npmName);
			if (!lib && npmChecked.indexOf(npmName) != -1) {
				npm.commands.install([npmName], function (err, data) {
					if (err) console.log('npm error'.red);
				});
			}
		}
	});
	callback();

}