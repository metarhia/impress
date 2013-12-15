(function(db) {

	var driver = impress.require('mongodb');

	if (driver) {
		var client = driver.MongoClient;
		db.drivers.mongodb = driver;

		db.mongodb = {};

		// ObjectID from string: db.mongodb.oid(str)
		//
		db.mongodb.oid = db.drivers.mongodb.ObjectID;

		// Open mongodb connection
		//
		// Example:
		//
		// open([{
		//   name: "databaseName",
		//   url: "mongodb://username:password@host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]",
		//   collections: ['collection1', 'collection2', ...]
		// },{...more connections...}],
		// function() {
		//   ...callback on all connections established...
		// });
		//
		db.mongodb.open = function(connections, callback) {
			var cbCount = 0, cbIndex = 0;
			for (var i = 0; i < connections.length; i++) cbCount = cbCount + connections[i].collections.length;
			for (var i = 0; i < connections.length; i++) {
				var connection = connections[i];
				client.connect(connection.url, function(err, clientConnection) {
					db.connections.push(connection.name);
					db[connection.name] = clientConnection;
					for (var j = 0; j < connection.collections.length; j++) {
						var collectionName = connection.collections[j];
						clientConnection.createCollection(collectionName, function(err, collection) {
							db[connection.name][collection.collectionName] = collection;
							cbIndex++;
							if (cbIndex>=cbCount && callback) callback(null);
						});
					}
				});
			}
		}
	}

} (global.db = global.db || {}));