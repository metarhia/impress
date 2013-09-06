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

	var identifierRegexp = /^[0-9,a-z,A-Z_\.]*$/;

	db.escape = function(str, quote) {
		quote = quote || "`";
		if (identifierRegexp.test(str)) return str;
		else return '`'+str+'`';
	}

} (global.db = global.db || {}));