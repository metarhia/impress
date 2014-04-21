module.exports = function(client, callback) {

	dbImpress.connection.collections(function(err, collections) {
		var items = [];
		for (var i = 0; i < collections.length; i++) {
			items.push(collections[i].collectionName);
		}
		client.context.data = items;
		callback();
	});

}