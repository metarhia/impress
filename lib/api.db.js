'use strict';

// Database interface for Impress Application Server
//
api.db = {};
api.db.drivers = {};
api.db.schema = {};

// Constants
var DEFAULT_RETRY_COUNT = 3,
    DEFAULT_RETRY_INTERVAL = '2s',
    DEFAULT_SLOW_TIME = '2s';

// Each implementation (e.g. api.db.mongodb.js and api.db.mysql.js)
// should have .open method
//
// api.db.<dbmsName>.open({
//   name: 'databaseName',
//   url: '<dbmsName>://connectionString',
//   retryCount: 3,
//   retryInterval: '2s'
//   // other database specific parameters
// }, callback);
//
// where <dbmsName> is 'mongodb' (for example) or
// other DBMS engine name in lowercase

var IDENTIFIER_REGEXP = /^[0-9,a-z,A-Z_.]*$/;

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
  api.db.schema.definition = api.definition.require('db.schema.definition');
  var databases = application.config.databases;
  var names = Object.keys(databases);
  if (databases && names.length > 0) {
    api.metasync.each(names, function(name, cb) {
      var database = {};
      database.config = databases[name];
      database.name = name;
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
//     database.name - database name: application.databases[database.name]
//     database.config - application.config.databases[database.name]
//     database.config.alias - global accessible database name (optional)
//   callback - function to be called when done
//
api.db.openDatabase = function(application, database, callback) {
  if (!application.databases) application.databases = {};
  database.application = application;
  var url = database.config.url;
  database.schema = url.substr(0, url.indexOf(':'));
  if (database.schema === 'postgres') database.schema = 'pgsql';
  var driver = api.db.getDriver(database.schema);
  database.alias = database.config.alias;
  database.url = database.config.url;
  database.slowTime = api.common.duration(
    database.config.slowTime || DEFAULT_SLOW_TIME
  );
  database.security = database.config.security;
  database.retryCount = database.retryCount || DEFAULT_RETRY_COUNT;
  database.retryCounter = 0;
  database.retryInterval = api.common.duration(
    database.retryInterval || DEFAULT_RETRY_INTERVAL
  );
  if (driver) {
    driver.open(database, function(err) {
      if (!err) {
        application.databases[database.name] = database;
        if (database.alias) application.sandbox[database.alias] = database;
      } else {
        application.log.warning('Can not open database: ' + database.name);
      }
      callback();
    });
  } else {
    if (impress.workerId === '1') {
      application.log.warning('No database driver for ' + database.url);
    }
    callback();
  }
};

// Check relational database schema keywords validity
//
api.db.schema.validate = function(databaseSchema, consoleOutput) {
  var result = api.definition.validate(
    databaseSchema, api.db.schema.definition, 'schema'
  );
  if (consoleOutput) {
    api.definition.printErrors('Error(s) in schema found:'.red.bold, result);
  }
  return result;
};
