module.exports = function(client, callback) {
	client.context.data = [];
	db.impress.users.find({}).toArray(function(err, nodes) {
		client.context.data = nodes;
		callback();
	});
}