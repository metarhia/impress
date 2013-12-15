(function(db) {

	var driver = impress.require('memcached');

	if (driver) {
		db.drivers.memcached = driver;
		db.memcached = {};

		// Open memcached connection
		//
		// Example:
		//
		// open([{
		//   name: "connectioName",
		//   url: "memcached://host:port",
		//   options: { poolSize:2000, ... }
		// },{...more connections...}],
		// function() {
		//   ...callback on all connections established...
		// });
		//
		db.memcached.open = function(connections, callback) {
			var cbCount = connections.length, cbIndex = 0;
			for (var i = 0; i < connections.length; i++) {
				var url = connections[i].url.replace('memcached://',''),
					connection = new driver(url, connections[i].url.options);
				db.connections.push(connections[i].name);
				db[connections[i].name] = connection;
				cbIndex++;
				if (cbIndex>=cbCount && callback) callback(null);
			}
		}
	}

} (global.db = global.db || {}));