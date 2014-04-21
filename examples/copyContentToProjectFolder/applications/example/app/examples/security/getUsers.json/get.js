module.exports = function(client, callback) {

	impress.security.db.users.find({}).toArray(function(err, nodes) {
		client.context.data = nodes;
		callback();
	});

}