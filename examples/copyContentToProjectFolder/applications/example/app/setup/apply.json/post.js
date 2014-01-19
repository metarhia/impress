module.exports = function(client, callback) {

    var npmList = [ 'mongodb', 'memcached', 'mysql', 'mysql-utilities', 'nodemailer', 'geoip-lite', 'websocket' ],
    	npmChecked = client.fields.npmChecked.split(',');

	impress.npm.load(impress.npm.config, function (err) {

		impress.npm.on("log", function (message) {
			console.log(message);
		});

		for (var i = 0; i < npmList.length; i++) {
			var npmName = npmList[i],
				lib = impress.require(npmName);
			if (!lib && npmChecked.indexOf(npmName) != -1) {
				impress.npm.commands.install([npmName], function (err, data) {
					if (err) console.log('npm error'.red);
				});
			}
		}

	});

	callback();

}