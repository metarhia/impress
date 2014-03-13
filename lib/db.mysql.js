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
			database.retryCounter++;
			var connection = driver.createConnection(database.url);
			connection.slowTime = database.slowTime;

			connection.on('query', function(err, res, fields, query) {
				if (err) impress.log.error('MySQL Error['+err.errno+']: '+err.code+'\t'+query.sql);
				if (impress.log.debug) impress.log.debug(query.sql);
			});

			connection.on('slow', function(err, res, fields, query, executionTime) {
				impress.log.slow(executionTime+'ms\t'+query.sql);
			});

			db.mysql.upgrade(connection);
			if (db.mysql.introspection) db.mysql.introspection(connection);

			connection.connect(function(err) {
				if (err) {
					impress.log.error(JSON.stringify(err));
					setTimeout(function() {
						if (database.retryCounter<=database.retryCount) db.mysql.open(database, callback);
					}, database.retryInterval);
				}
				database.retryCounter = 0;
			});

			connection.on('error', function(err) {
				impress.log.error(JSON.stringify(err));
				if (err.code === 'PROTOCOL_CONNECTION_LOST') {
					if (database.retryCounter<=database.retryCount) db.mysql.open(database, callback);
				}
			});
			
			database.connection = connection;
			callback(null);
		}

	}	

} (global.db = global.db || {}));