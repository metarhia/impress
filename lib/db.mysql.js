(function(db) {

	var driver = require('mysql');
	db.drivers.mysql = driver;

	var Introspection = require('./Introspection');

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
			db.mysql.upgrade(connection);
			Introspection.init(connection);
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

	db.mysql.upgrade = function(connection) {

	connection.count = function(table, callback) {
		this.queryValue('SELECT count(*) FROM ??', [table], function(err, res) {
			callback(err, res);
		});
	}

	// Returns single row as associative array of fields
	//
	connection.queryRow = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			if (err) res = false; else res = res[0] ? res[0] : false;
			callback(err, res, fields);
		});
	}

	// Returns single value (scalar)
	//
	connection.queryValue = function(sql, values, callback) {
		this.queryRow(sql, values, function(err, res, fields) {
			if (err) res = false; else res = res[Object.keys(res)[0]];
			callback(err, res, fields);
		});
	}

	// Query returning array of first field values
	//
	connection.queryArray = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			var result = [];
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result.push(row[Object.keys(row)[0]]);
				}
			}
			callback(err, result, fields);
		});
	}

	// Query returning hash (associative array), first field will be array key
	//
	connection.queryHash = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			var result = {};
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result[row[Object.keys(row)[0]]] = row;
				}
			}
			callback(err, result, fields);
		});
	}

	// Query returning key-value array, first field of query will be key and second will be value
	//
	connection.queryKeyValue = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			var result = {};
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result[row[Object.keys(row)[0]]] = row[Object.keys(row)[1]];
				}
			}
			callback(err, result, fields);
		});
	
	}

	}

} (global.db = global.db || {}));