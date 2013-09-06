module.exports = function(req, res, callback) {

	res.context.data = { status: 0 };

	var items = [],
		path = req.post.id.substring(1).split('/'),
		dbName = path[0],
		database = impress.config.databases[dbName],
		schema = database.url.substr(0, database.url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 2) {
		if (schema == 'mysql') {
			driver.query('DROP DATABASE '+db.escape(path[1]), [], function(err, result) {
				if (!err) res.context.data = { status: 1 };
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			client.connect(url, function(err, connection) {
				connection.dropDatabase(function(err, result) {
					if (!err) res.context.data = { status: 1 };
					callback();
				});
			});
		} else callback();
	} else if (path.length == 3) {
		if (schema == 'mysql') {
			var tableName = path[1]+'.'+path[2];
			driver.query('DROP TABLE '+db.escape(tableName), [], function(err, result) {
				if (!err) res.context.data = { status: 1 };
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			client.connect(url, function(err, connection) {
				connection.dropCollection(path[2], function(err, result) {
					if (!err) res.context.data = { status: 1 };
					callback();
				});
			});
		} else callback();
	}

}