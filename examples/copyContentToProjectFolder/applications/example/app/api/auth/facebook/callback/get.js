module.exports = function(client, callback) {
	client.passport.init(function () {
		client.passport.strategies.facebook.authenticateCallback(client.req, client.res, callback);
	}, callback);
};