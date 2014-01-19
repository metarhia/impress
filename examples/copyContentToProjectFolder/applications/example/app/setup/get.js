module.exports = function(client, callback) {

    var npmList = [ 'mongodb', 'memcached', 'mysql', 'mysql-utilities', 'nodemailer', 'geoip-lite', 'websocket' ],
    	npmChecks = {};

	for (var i = 0; i < npmList.length; i++) {
		var npmName = npmList[i],
			lib = impress.require(npmName);
		npmChecks[npmName] = lib ? 'checked' : '';
	}

	client.context.data = {
		npm: npmChecks
	};

	callback();

}