(function(db) {

	var driver = impress.require('mongodb');

	if (driver) {
		var client = driver.MongoClient;
		db.drivers.mongodb = driver;

		db.mongodb = {};

		// ObjectID from string: db.mongodb.oid(str)
		//
		db.mongodb.oid = db.drivers.mongodb.ObjectID;

		// Open mongodb database
		//
		// Example:
		//
		// open({
		//   name: "databaseName",
		//   url: "mongodb://username:password@host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]",
		//   collections: ['collection1', 'collection2', ...]
		// }, callback);
		//
		// callback after connection established
		//
		db.mongodb.open = function(database, callback) {
			var cbCount = database.collections.length,
				cbIndex = 0;
			client.connect(database.url, function(err, clientConnection) {
				database.connection = clientConnection;
				for (var i = 0; i < database.collections.length; i++) {
					var collectionName = database.collections[i];
					clientConnection.createCollection(collectionName, function(err, collection) {
						database[collection.collectionName] = collection;
						if (++cbIndex>=cbCount && callback) callback(null);
					});
				}
			});
		}
	}

} (global.db = global.db || {}));