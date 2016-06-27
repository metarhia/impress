'use strict';

// Database interface for Impress Application Server
//
api.db = {};
api.db.drivers = {};

// Constants
var DEFAULT_RETRY_COUNT = 3,
    DEFAULT_RETRY_INTERVAL = '2s',
    DEFAULT_SLOW_TIME = '2s';

// Each realization (e.g. api.db.mongodb.js and api.db.mysql.js) should implement .open method
//
// api.db.<dbmsName>.open({
//     name: 'databaseName',
//     url: '<dbmsName>://connectionString',
//     retryCount: 3,
//     retryInterval: '2s'
//     // other database specific parameters
//  }, callback);
//
// where <dbmsName> is 'mongodb' (for example) or other DBMS engine name in lowercase

var IDENTIFIER_REGEXP = /^[0-9,a-z,A-Z_\.]*$/;

// Escaping values, parameters:
//   str - string to be escaped
//   quote - optional, quote character
//
api.db.escape = function(str, quote) {
  quote = quote || '`';
  if (IDENTIFIER_REGEXP.test(str)) return str;
  else return quote + str + quote;
};

// Load driver
//   driverName - driver name, e.g. mongodb, mysql, pgsql, mamcached
//   returns - driver object
//
api.db.getDriver = function(driverName) {
  var driver = api.db[driverName];
  if (!driver) {
    require('./api.db.' + driverName);
    driver = api.db[driverName];
  }
  return driver;
};

// Open application databases
//
api.db.openApplicationDatabases = function(application, callback) {
  var databases = application.config.databases;
  if (databases && Object.keys(databases).length > 0) {
    api.common.each(Object.keys(databases), function(databaseName, cb) {
      var database = databases[databaseName];
      database.name = databaseName;
      api.db.openDatabase(application, database, cb);
    }, function() {
      application.emit('databasesOpened');
      callback();
    });
  } else callback();
};

// Open application databases
//   application - add database to this application
//   database - database definition (see /config/databases.js)
//     database.name - database name in hash: application.databases[database.name]
//     database.alias - global accessible database name (optional)
//   callback - function to be called when done
//
api.db.openDatabase = function(application, database, callback) {
  if (!application.databases) application.databases = {};
  database.application = application;
  database.schema = database.url.substr(0, database.url.indexOf(':'));
  if (database.schema === 'postgres') database.schema = 'pgsql';
  var driver = api.db.getDriver(database.schema);
  database.slowTime = api.common.duration(database.slowTime || DEFAULT_SLOW_TIME);
  database.retryCount = database.retryCount || DEFAULT_RETRY_COUNT;
  database.retryCounter = 0;
  database.retryInterval = api.common.duration(database.retryInterval || DEFAULT_RETRY_INTERVAL);
  if (driver) driver.open(database, function(err) {
    if (!err) {
      application.databases[database.name] = database;
      if (database.alias) application.sandbox[database.alias] = database.connection;
    } else {
      application.log.warning('Can not open database: ' + database.name);
    }
    callback();
  }); else {
    if (process.isMaster) application.log.warning('No database driver for ' + database.url);
    callback();
  }
};

// Database schema
//
api.db.schema = {};
api.db.schema.definition = api.definition.require('db.schema.definition');

// Check relational database schema keywords validity
//
api.db.schema.validate = function(databaseSchema, consoleOutput) {
  var result = api.definition.validate(databaseSchema, api.db.schema.definition, 'schema');
  if (consoleOutput) api.definition.printErrors('Error(s) in schema found:'.red.bold, result);
  return result;
};
