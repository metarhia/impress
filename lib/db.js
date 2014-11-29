'use strict';

global.db = {};

// TODO: test db and dbmi against v0.1.1

db.drivers = {};

// Constants
db.DEFAULT_RETRY_COUNT = 3;
db.DEFAULT_RETRY_INTERVAL = '2s';

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
//   <str> - string to be escaped
//   <quote> - optional, quote character
//
db.escape = function(str, quote) {
  quote = quote || '`';
  if (identifierRegexp.test(str)) return str;
  else return quote + str + quote;
};

// Open application databases
//
db.openApplicationDatabases = function(application, callback) {
  if (application.config.databases) {
    application.databases = {};
    var databaseName,
        databases = application.config.databases,
        cbCount = Object.keys(databases).length,
        cbIndex = 0,
        cb = function() { if (++cbIndex >= cbCount && callback) callback(); };
    if (cbCount === 0) callback();
    else {
      for (databaseName in databases) {
        (function() {
          var database = databases[databaseName];
          database.application = application;
          var schema = database.url.substr(0, database.url.indexOf(':'));
          if (schema === 'postgres') schema = 'pgsql';
          var driver = db[schema];
          database.slowTime = duration(database.slowTime || impress.defaultSlowTime);
          database.name = databaseName;
          database.retryCount = database.retryCount || db.DEFAULT_RETRY_COUNT;
          database.retryCounter = 0;
          database.retryInterval = duration(database.retryInterval || db.DEFAULT_RETRY_INTERVAL);
          if (driver) driver.open(database, function(err) {
            if (!err) {
              application.databases[database.name] = database;
              application.sandbox[database.name] = database;
              if (database.security) application.databases.security = database;
            } else console.log('Can not open database: ' + database.name);
            cb();
          }); else {
            if (api.cluster.isMaster) console.log('No database driver for ' + databaseName.bold);
            cb();
          }
        } ());
      }
    }
  } else callback();
};
