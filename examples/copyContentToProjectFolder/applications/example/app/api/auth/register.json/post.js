module.exports = function(client, callback) {
	security.register(client, function(err, user) {
		if (user) client.context.data = { Result: "Ok" };
		else client.context.data = { Result: "Error" };
		callback();
	});
}