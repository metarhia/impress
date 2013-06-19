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
			connection.connect();
			db.connections.push(connections[i].name);
			db[connections[i].name] = connection;
			cbIndex++;
			if (cbIndex>=cbCount && callback) callback(null);
		}
	}

} (global.db = global.db || {}));