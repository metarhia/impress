'use strict';

global.db = {};
db.drivers = {};

// Constants
db.DEFAULT_RETRY_COUNT = 3;
db.DEFAULT_RETRY_INTERVAL = '2s';
db.DEFAULT_SLOW_TIME = '2s';

// Each realization (e.g. db.mongodb.js and db.mysql.js) should implement .open method
//
// db.<dbmsName>.open({
//     name: 'databaseName',
//     url: '<dbmsName>://connectionString',
//     retryCount: 3,
//     retryInterval: '2s'
//     // other database specific parameters
//  }, callback);
//
// where <dbmsName> is 'mongodb' (for example) or other DBMS engine name in lowercase

var identifierRegexp = /^[0-9,a-z,A-Z_\.]*$/;

// Escaping values, parameters:
//   str - string to be escaped
//   quote - optional, quote character
//
db.escape = function(str, quote) {
  quote = quote || '`';
  if (identifierRegexp.test(str)) return str;
  else return quote + str + quote;
};

// Load driver
//   driverName - driver name, e.g. mongodb, mysql, pgsql, mamcached
//   returns - driver object
//
db.getDriver = function(driverName) {
  var driver = db[driverName];
  if (!driver) {
    require('./db.' + driverName);
    driver = db[driverName];
  }
  return driver;
};

// Open application databases
//
db.openApplicationDatabases = function(application, callback) {
  if (application.config.databases) {
    var databases = application.config.databases;
    api.async.each(Object.keys(databases), function(databaseName, cb) {
      var database = databases[databaseName];
      database.name = databaseName;
      db.openDatabase(application, database, cb);
    }, callback);
  } else callback();
};

// Open application databases
//   application - add database to this application
//   database - database definition (see /config/databases.js)
//     database.name - database name in hash: application.databases[database.name]
//     database.alias - global accessible database name (optional)
//   callback - function to be called when done
//
db.openDatabase = function(application, database, callback) {
  if (!application.databases) application.databases = {};
  database.application = application;
  database.schema = database.url.substr(0, database.url.indexOf(':'));
  if (database.schema === 'postgres') database.schema = 'pgsql';
  var driver = db.getDriver(database.schema);
  database.slowTime = api.impress.duration(database.slowTime || db.DEFAULT_SLOW_TIME);
  database.retryCount = database.retryCount || db.DEFAULT_RETRY_COUNT;
  database.retryCounter = 0;
  database.retryInterval = api.impress.duration(database.retryInterval || db.DEFAULT_RETRY_INTERVAL);
  if (driver) driver.open(database, function(err) {
    if (!err) {
      application.databases[database.name] = database;
      if (database.alias) application.sandbox[database.alias] = database;
      if (database.security) application.databases.security = database;
    } else application.log.warning('Can not open database: ' + database.name);
    callback();
  }); else {
    if (api.cluster.isMaster) application.log.warning('No database driver for ' + database.url);
    callback();
  }
};

// Database schema
//
db.schema = {};
db.schema.definition = api.definition.require('db.schema.definition');

// Check relational database schema keywords validity
//
db.schema.validate = function(databaseSchema, consoleOutput) {
  var result = api.definition.validate(databaseSchema, db.schema.definition, 'schema');
  if (consoleOutput) api.definition.printErrors('Error(s) in schema found:'.red.bold, result);
  return result;
};
