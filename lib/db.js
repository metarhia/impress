'use strict';

// Database interface for Impress Application Server

api.db = {};
api.db.drivers = {};

// Constants

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_INTERVAL = api.common.duration('2s');
const DEFAULT_SLOW_TIME = api.common.duration('2s');

// Each implementation (e.g. api.db.mongodb.js and api.db.mysql.js)
// should have .open method
//
// api.db.<dbmsName>.open({
//   name: 'databaseName',
//   url: '<dbmsName>://connectionString',
//   retryCount: 3,
//   retryInterval: Duration('2s')
//   // other database specific parameters
// }, callback);
//
// where <dbmsName> is 'mongodb' (for example) or
// other DBMS engine name in lowercase

const IDENTIFIER_REGEXP = /^[0-9,a-z,A-Z_.]*$/;

// Escape
//  str <string> string to be escaped
//  quote <string> quote character (optional)
api.db.escape = (str, quote = '`') => (
  IDENTIFIER_REGEXP.test(str) ? str : quote + str + quote
);

// Get DB Driver
//   driverName <string> driver name, e.g. mongodb, mysql, pgsql, oracle
// Returns: <Object>
api.db.getDriver = driverName => {
  let driver = api.db[driverName];
  if (!driver) {
    require('./db.' + driverName);
    driver = api.db[driverName];
  }
  return driver;
};

api.db.openApplicationDatabases = (application, callback) => {
  const { databases } = application.config.sections;
  if (!databases) {
    callback();
    return;
  }
  const names = Object.keys(databases);
  if (names.length === 0) {
    callback();
    return;
  }
  api.metasync.each(names, (name, cb) => {
    const database = {};
    database.config = databases[name];
    database.name = name;
    api.db.openDatabase(application, database, cb);
  }, () => {
    application.emit('databasesOpened');
    callback();
  });
};

// Open Database
//   application <Object> add database to this application
//   database <Object> database definition (see /config/databases.js)
//     name <string> database name: application.databases[database.name]
//     config <Object> application.config.sections.databases[database.name]
//       alias <string> global accessible database name (optional)
//   callback // function to be called when done
api.db.openDatabase = (application, database, callback) => {
  database.application = application;
  const url = database.config.url;
  database.schema = url.substr(0, url.indexOf(':'));
  if (database.schema === 'postgres') database.schema = 'pgsql';
  const driver = api.db.getDriver(database.schema);
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
    driver.open(database, err => {
      if (err) {
        impress.log.warn('Can\'t open database: ' + database.name);
      } else {
        application.databases[database.name] = database;
        if (database.alias) {
          application.sandbox[database.alias] = database.connection;
        }
      }
      callback();
    });
  } else {
    impress.log.warn('No database driver for ' + database.url);
    callback();
  }
};
