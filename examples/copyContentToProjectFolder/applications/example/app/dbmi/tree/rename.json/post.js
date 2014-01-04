module.exports = function(client, callback) {

	client.context.data = { status: 0 };

	var items = [],
		path = client.req.fields.id.substring(1).split('/'),
		dbName = path[0],
		database = impress.config.databases[dbName],
		schema = database.url.substr(0, database.url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 2) {
		if (schema == 'mysql') { // [TODO]

			// CREATE DATABASE new_database
			// for table in SHOW TABLES old_database
			// do
			//   RENAME TABLE old_database.table to new_database.table
			// done
			// DROP DATABASE old_database

			driver.query('RENAME DATABASE '+db.escape(path[1])+' TO '+db.escape(client.req.fields.title), [], function(err, result) {
				if (!err) client.context.data = { status: 1 };
				callback();
			});
		} else if (schema == 'mongodb') { // [TODO]
			var dbClient = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			dbClient.connect(url, function(err, connection) {
				callback();
				//connection.dropDatabase(function(err, result) {
				//	if (!err) client.context.data = { status: 1 };
				//	callback();
				//});
			});
		} else callback();
	} else if (path.length == 3) {
		if (schema == 'mysql') { // [OK]
			var tableName = path[1]+'.'+path[2];
			driver.query('RENAME TABLE '+db.escape(tableName)+' TO '+db.escape(path[1]+'.'+client.req.fields.title), [], function(err, result) {
				if (!err) client.context.data = { status: 1 };
				callback();
			});
		} else if (schema == 'mongodb') { // [OK]
			var dbClient = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			dbClient.connect(url, function(err, connection) {
				connection.renameCollection(path[2], client.req.fields.title, function(err, result) {
					if (!err) client.context.data = { status: 1 };
					callback();
				});
			});
		} else callback();
	}

}