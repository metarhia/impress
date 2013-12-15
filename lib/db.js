(function(db) {

	db.drivers = {};
	db.connections = [];

	// Each realization (e.g. db.mongodb.js and db.mysql.js) should implement .open method
	//
	// db.<dbmsName>.open([{
	//   name: "databaseName",
	//   url: "<dbmsName>://connectionString"
	//   ...other database specific parameters...
	// },...multiple connections here...], callback);
	//
	// where <dbmsName> is "mongodb" (for example) or other DBMS engine name in lowercase

	var identifierRegexp = /^[0-9,a-z,A-Z_\.]*$/;

	// Escaping values, parameters:
	//   <str> - string to be escaped
	//   <quote> - optional, quote character
	//
	db.escape = function(str, quote) {
		quote = quote || "`";
		if (identifierRegexp.test(str)) return str;
		else return '`'+str+'`';
	}

} (global.db = global.db || {}));