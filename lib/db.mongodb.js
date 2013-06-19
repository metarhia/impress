(function(db) {

	var driver = require('mongodb'),
		client = driver.MongoClient;
	db.drivers.mongodb = driver;

	db.mongodb = {};

	// ObjectID from string: db.mongodb.oid(str)
	db.mongodb.oid = db.drivers.mongodb.ObjectID;

	// open([{
	//   name: "databaseName",
	//   url: "mongodb://username:password@host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]",
	//   collections: ['collection1', 'collection2', ...]
	// },{...more connections...}],
	// function() {
	//   ...callback on all connections established...
	// });
	db.mongodb.open = function(connections, callback) {
		var cbCount = 0, cbIndex = 0;
		for (var i in connections) cbCount = cbCount + connections[i].collections.length;
		for (var i in connections) {
			client.connect(connections[i].url, function(err, connection) {
				db.connections.push(connections[i].name);
				db[connections[i].name] = connection;
				for (var j in connections[i].collections) {
					var collectionName = connections[i].collections[j];
					connection.createCollection(collectionName, function(err, collection) {
						db[connections[i].name][collection.collectionName] = collection;
						cbIndex++;
						if (cbIndex>=cbCount && callback) callback(null);
					});
				}
			});
		}
	}

} (global.db = global.db || {}));