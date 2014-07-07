module.exports = function(client, callback) {
	client.passport.init(function () {
		client.passport.strategies.facebook.authenticate(client.req, client.res, callback);
	}, callback);
};