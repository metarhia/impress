'use strict';

var db = api.db;
api.pgsql = api.impress.require('pg');

if (api.pgsql) {

  db.pgsql = {};
  db.drivers.pgsql = api.pgsql;

  // Open pgsql database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'postgres://username:password@host/database',
  //   tables: [ 'table1', 'table2', ... ]
  // }, callback);
  //
  // callback after connection established
  //
  db.pgsql.open = function(database, callback) {

    database.retryCounter++;
    var application = database.application,
        connection = new api.pgsql.Client(database.url);
    connection.slowTime = database.slowTime;

    // db.pgsql.upgrade(connection);

    connection.connect(function(err) {
      if (err) {
        application.log.error(JSON.stringify(err));
        setTimeout(function() {
          if (database.retryCounter <= database.retryCount) db.pgsql.open(database, callback);
        }, database.retryInterval);
      }
      database.retryCounter = 0;
    });

    connection.on('query', function(err, res, query) {
      if (err) application.log.error('PgSQL Error[' + err.code + ']: ' + err.toString() + '\t' + query.text);
      application.log.debug(query.text);
    });

    connection.on('slow', function(err, res, query, executionTime) {
      application.log.slow(executionTime + 'ms\t' + query.text);
    });

    connection.on('error', function(err) {
      application.log.error(JSON.stringify(err));
    });

    database.connection = connection;
    callback();
  };

  db.pgsql.upgrade = function(connection) {

    connection.slowTime = 2000;

    api.impress.override(connection, function query(sql, values, callback) {
      var startTime = Date.now();
      if (typeof(values) === 'function') {
        callback = values;
        values = [];
      }
      var aQuery = query.inherited(sql, values, function(err, res) {
        var endTime = Date.now(),
            executionTime = endTime - startTime;
        connection.emit('query', err, res, aQuery);
        if (connection.slowTime && (executionTime >= connection.slowTime)) {
          connection.emit('slow', err, res, aQuery, executionTime);
        }
        if (callback) callback(err, res);
      });
      return aQuery;
    });

  };

  // PgSQL schema utilities stub
  //
  db.pgsql.schema = {};

  // Generate relational database schema for PgSQL
  //
  db.pgsql.schema.generateScript = function(databaseSchema, consoleOutput) {
  };

  // Execute multiple statements script for PgSQL
  //
  db.pgsql.schema.executeScript = function(target, script, callback) {
  };

}
