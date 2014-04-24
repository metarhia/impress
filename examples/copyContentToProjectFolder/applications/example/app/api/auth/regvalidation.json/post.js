module.exports = function(client, callback) {
	impress.security.getUser(client, client.fields.Email, function(err, user) {
		callback({ Email: !user });
	});
}