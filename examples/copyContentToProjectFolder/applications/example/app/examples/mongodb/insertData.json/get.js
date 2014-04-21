module.exports = function(client, callback) {

	dbAlias.testCollection.insert(client.query, function(err) {
		client.context.data = !err;
		callback();
	});

}