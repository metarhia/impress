module.exports = function(client, callback) {
	impress.security.db.sessions.find({}).toArray(function(err, nodes) {
		client.context.data = nodes;
		callback();
	});
}