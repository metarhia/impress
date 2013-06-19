(function(db) {

	db.drivers = {};
	db.connections = [];

	// each realization (e.g. db.mongodb.js and db.mysql.js) should implement
	// db.<dbmsName>.open([{
	//   name: "databaseName",
	//   url: "<dbmsName>://connectionString"
	//   ...other database specific parameters...
	// },...multiple connections here...], callback);
	// where <dbmsName> is "mongodb" or other DBMS engine name in lowercase

} (global.db = global.db || {}));