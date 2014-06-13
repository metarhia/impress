module.exports = function(client, callback) {
	client.passport.strategies.google.authenticate(client.req, client.res);
};