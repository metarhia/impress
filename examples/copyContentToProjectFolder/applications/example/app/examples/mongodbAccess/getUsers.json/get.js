module.exports = function(client, callback) {
	client.context.data = [];
	impress.security.db.users.find({}).toArray(function(err, nodes) {
		client.context.data = nodes;
		callback();
	});
}