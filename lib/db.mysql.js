(function(db) {

	var driver = require('mysql');
	db.drivers.mysql = driver;

	db.mysql = {};

	// open([{
	//   name: "connectioName",
	//   url: "mongodb://username:password@host1/database",
	//   tables: ['table1', 'table2', ...]
	// },{...more connections...}],
	// function() {
	//   ...callback on all connections established...
	// });
	db.mysql.open = function(connections, callback) {
		var cbCount = connections.length, cbIndex = 0;
		for (var i in connections) {
			var connection = driver.createConnection(connections[i].url);
			connection.on('error', db.mysql.onError);
			connection.queryRow      = db.mysql.queryRow;
			connection.queryValue    = db.mysql.queryValue;
			connection.queryArray    = db.mysql.queryArray;
			connection.queryKeyValue = db.mysql.queryKeyValue;
			connection.count         = db.mysql.count;
			connection.primary       = db.mysql.primary;
			connection.foreign       = db.mysql.foreign;
			connection.fields        = db.mysql.fields;
			connection.databases     = db.mysql.databases;
			connection.tables        = db.mysql.tables;
			connection.tableInfo     = db.mysql.tableInfo;
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

	// Returns single row as associative array of fields
	//
	db.mysql.queryRow = function(query, values, callback) {
		this.query(query, values, function(err, res) {
			if (err) res = false; else res = res[0] ? res[0] : false;
			callback(err, res);
		});
	}

	// Returns single value
	//
	db.mysql.queryValue = function(query, values, callback) {
		this.queryRow(query, values, function(err, res) {
			if (err) res = false; else res = res[Object.keys(res)[0]];
			callback(err, res);
		});
	}

	// Query associative array, first field will be array key
	//
	db.mysql.queryArray = function(query, values, callback) {
		this.query(query, values, function(err, res) {
			var result = {};
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result[row[Object.keys(row)[0]]] = row;
				}
			}
			callback(err, result);
		});
	}

	// Query key-value array, first field will be key and second will be value
	//
	db.mysql.queryKeyValue = function(query, values, callback) {
		this.query(query, values, function(err, res) {
			var result = {};
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result[row[Object.keys(row)[0]]] = row[Object.keys(row)[1]];
				}
			}
			callback(err, result);
		});
	}

	db.mysql.count = function(table, where, callback) {
		var sql = 'SELECT count(*) FROM ??';
		if (where) sql = sql+' where '+where;
		this.queryValue(sql, [table], function(err, res) {
			callback(err, res);
		});
	}

	db.mysql.primary = function(table, callback) {
		this.queryRow('SHOW KEYS FROM ?? WHERE Key_name = "PRIMARY"', [table], function(err, res) {
			callback(err, res);
		});
	}

	db.mysql.foreign = function(table, callback) {
		this.query(
			'SELECT CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION, POSITION_IN_UNIQUE_CONSTRAINT, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME '+
			'FROM information_schema.KEY_COLUMN_USAGE '+
			'WHERE REFERENCED_TABLE_NAME IS NOT NULL AND CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? '+
			'ORDER BY REFERENCED_TABLE_NAME',
			['mezha', table],
			function(err, res) {
				if (err) res = false;
				callback(err, res);
			}
		);
	}

	db.mysql.fields = function(table, callback) {
		this.query('SHOW FULL COLUMNS FROM ??', [table], function(err, res) {
			if (err) res = false;
			callback(err, res);
		});
	}

	db.mysql.databases = function(mask, callback) {
		this.query('SHOW DATABASES LIKE ?', [mask], function(err, res) {
			var result = [];
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result.push(row[Object.keys(row)[0]]);
				}
			}
			callback(err, result);
		});
	}

	db.mysql.tables = function(mask, callback) {
		this.query('SHOW TABLES LIKE ?', [mask], function(err, res) {
			var result = [];
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result.push(row[Object.keys(row)[0]]);
				}
			}
			callback(err, result);
		});
	}

	db.mysql.tableInfo = function(table, callback) {
		this.query('SHOW TABLE STATUS LIKE ?', [table], function(err, res) {
			if (err) res = false;
			callback(err, res);
		});
	}

} (global.db = global.db || {}));