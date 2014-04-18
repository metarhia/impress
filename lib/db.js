(function(db) {

	// TODO: test db and dbmi against v0.1.1

	db.drivers = {};

	// Constants
	db.defaultRetryCount = 3;
	db.defaultRetryInterval = "2s";

	// Each realization (e.g. db.mongodb.js and db.mysql.js) should implement .open method
	//
	// db.<dbmsName>.open({
	//     name: "databaseName",
	//     url: "<dbmsName>://connectionString",
	//     retryCount: 3,
	//     retryInterval: "2s"
	//     // other database specific parameters
	//  }, callback);
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

	// Open application databases
	//
	db.openApplicationDatabases = function(application, callback) {
		if (application.config.databases) {
			application.databases = {};
			var databases = application.config.databases,
				cbCount = Object.keys(databases).length,
				cbIndex = 0;
			for (var databaseName in databases) {
				var database = databases[databaseName],
					schema = database.url.substr(0, database.url.indexOf(':')),
					driver = db[schema];
				database.slowTime = duration(database.slowTime || impress.defaultSlowTime);
				database.name = databaseName;
				database.retryCount = database.retryCount || db.defaultRetryCount;
				database.retryCounter = 0;
				database.retryInterval = duration(database.retryInterval || db.defaultRetryInterval);
				application.databases[databaseName] = database;
				if (database.security) application.databases.security = database;
				if (database.alias && application.sandbox) application.sandbox[database.alias] = database;
				if (driver) driver.open(database, function() {
					if (++cbIndex>=cbCount && callback) callback();
				}); else {
					if (impress.cluster.isMaster) console.log('No database driver for '+databaseName.bold);
					if (++cbIndex>=cbCount && callback) callback();
				}
			}
		}
	}

} (global.db = global.db || {}));