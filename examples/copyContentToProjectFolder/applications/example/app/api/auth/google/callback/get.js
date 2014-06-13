module.exports = function(client, callback) {
	client.passport.strategies.google.authenticateCallback(client.req, client.res);
};