module.exports = function(req, res, callback) {

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

}