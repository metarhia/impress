(function(db) {

	var driver = impress.require('mysql'),
		utilities = impress.require('mysql-utilities');

	if (driver) {
		db.drivers.mysql = driver;
		db.mysql = {};

		// Open mysql connection
		//
		// Example:
		//
		// open([{
		//   name: "connectioName",
		//   url: "mongodb://username:password@host1/database",
		//   tables: ['table1', 'table2', ...]
		// },{...more connections...}],
		// function() {
		//   ...callback on all connections established...
		// });
		//
		db.mysql.open = function(connections, callback) {
			var cbCount = connections.length, cbIndex = 0;
			for (var i = 0; i < connections.length; i++) {
				var connection = driver.createConnection(connections[i].url);
				connection.slowTime = connections[i].slowTime;
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
				db.connections.push(connections[i].name);
				db[connections[i].name] = connection;
				cbIndex++;
				if (cbIndex>=cbCount && callback) callback(null);
			}
		}

		// Writes error messages to log file
		//
		db.mysql.onError = function(err) {
			impress.log.error(JSON.stringify(err));
		}

		if (utilities) {
			db.mysql.upgrade = utilities.upgrade;
			db.mysql.introspection = utilities.introspection;
		}
	}	

} (global.db = global.db || {}));