module.exports = function(req, res, callback) {

    if (impress.geoip) {
		impress.dns.lookup('nodejs.org', 4, function(err, address, family) {
			res.context.data = {
				req: {
					connection: {
						remoteAddress: req.connection.remoteAddress,
						geoip: impress.geoip.lookup(req.connection.remoteAddress)
					}
				},
				example: {
					nodejs: {
						host: 'nodejs.org',
						geoip: impress.geoip.lookup(address)
					}
				}
			};
			callback();
		});
	} else {
			res.context.data = { msg: "GeoIP module is not installed, you can add it using: npm install geoip-lite" };
			callback();
	}

}