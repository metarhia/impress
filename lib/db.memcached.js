"use strict";

var driver = impress.require('memcached');

if (driver) {

	db.drivers.memcached = driver;
	global.db.memcached = {};

	// Open memcached database
	//
	// Example:
	//
	// open({
	//   name: "databaseName",
	//   url: "memcached://host:port",
	//   options: { poolSize:2000, ... }
	// }, callback);
	//
	// callback after connection established
	//
	global.db.memcached.open = function(database, callback) {
		var url = database.url.replace('memcached://','');
		database.connection = new driver(url, database.options);
		callback(null);
	};

}