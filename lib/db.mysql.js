(function(db) {

	var driver = impress.require('mysql'),
		utilities = impress.require('mysql-utilities');

	if (driver) {
		db.drivers.mysql = driver;
		db.mysql = {};

		if (utilities) {
			db.mysql.upgrade = utilities.upgrade;
			db.mysql.introspection = utilities.introspection;
		}

		// Open mysql database
		//
		// Example:
		//
		// open({
		//   name: "databaseName",
		//   url: "mongodb://username:password@host1/database",
		//   tables: ['table1', 'table2', ...]
		// }, callback);
		//
		// callback after connection established
		//
		db.mysql.open = function(database, callback) {
			var connection = driver.createConnection(database.url);
			connection.slowTime = database.slowTime;
			connection.on('error', db.mysql.onError);

			connection.on('query', function(err, res, fields, query) {
				if (err) impress.log.error('MySQL Error['+err.errno+']: '+err.code+'\t'+query.sql);
				if (impress.log.debug) impress.log.debug(query.sql);
			});

			connection.on('slow', function(err, res, fields, query, executionTime) {
				impress.log.slow(executionTime+'ms\t'+query.sql);
			});

			db.mysql.upgrade(connection);
			if (db.mysql.introspection) db.mysql.introspection(connection);
			connection.connect();
			database.connection = connection;
			callback(null);
		}

		// Writes error messages to log file
		//
		db.mysql.onError = function(err) {
			impress.log.error(JSON.stringify(err));
		}
	}	

} (global.db = global.db || {}));