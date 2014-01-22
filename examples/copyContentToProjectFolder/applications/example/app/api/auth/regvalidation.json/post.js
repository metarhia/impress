module.exports = function(client, callback) {
	impress.security.getUser(client, client.fields.Email, function(err, user) {
		client.context.data = { Email: !user };
		callback();
	});
}