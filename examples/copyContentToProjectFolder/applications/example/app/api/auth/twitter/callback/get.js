module.exports = function(client, callback) {
	client.passport.init(function () {
		client.passport.strategies.twitter.authenticateCallback(client.req, client.res, callback);
	}, callback);
};