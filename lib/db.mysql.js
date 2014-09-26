"use strict";

var driver = impress.require('mysql'),
    utilities = impress.require('mysql-utilities');

if (driver) {

  db.mysql = {};
  db.drivers.mysql = driver;

  if (utilities) {
    db.mysql.upgrade = utilities.upgrade;
    db.mysql.introspection = utilities.introspection;
  }

  // Open mysql database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'mysql://username:password@host/database',
  //   tables: [ 'table1', 'table2', ... ]
  // }, callback);
  //
  // callback after connection established
  //
  db.mysql.open = function(database, callback) {
    database.retryCounter++;
    var application = database.application,
        connection = driver.createConnection(database.url);
    connection.slowTime = database.slowTime;

    db.mysql.upgrade(connection);
    if (db.mysql.introspection) db.mysql.introspection(connection);

    connection.connect(function(err) {
      if (err) {
        application.log.error(JSON.stringify(err));
        setTimeout(function() {
          if (database.retryCounter<=database.retryCount) db.mysql.open(database, callback);
        }, database.retryInterval);
      }
      database.retryCounter = 0;
    });

    connection.on('query', function(err, res, fields, query) {
      if (err) application.log.error('MySQL Error['+err.errno+']: '+err.code+'\t'+query.sql);
      if (impress.log.debug) application.log.debug(query.sql);
    });

    connection.on('slow', function(err, res, fields, query, executionTime) {
      application.log.slow(executionTime+'ms\t'+query.sql);
    });

    connection.on('error', function(err) {
      application.log.error(JSON.stringify(err));
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        if (database.retryCounter<=database.retryCount) db.mysql.open(database, callback);
      }
    });

    database.connection = connection;
    callback();
  };

}
