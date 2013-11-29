(function(impress) {

	impress.geoip = impress.require('geoip-lite');

	if (!impress.geoip) {
		if (impress.cluster.isMaster) {
			console.log(
				'Warning: GeoIP library with IP database is not available\n'.yellow.bold+
				'  You need to install it using'+' npm install geoip-lite'.green+' or disable in config.js\n'
			);
		}
	}


} (global.impress = global.impress || {}));