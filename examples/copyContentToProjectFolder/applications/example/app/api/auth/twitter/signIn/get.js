module.exports = function(client, callback) {
	client.passport.init(function () {
		client.passport.strategies.twitter.authenticate(client.req, client.res, callback);
	}, callback);
};