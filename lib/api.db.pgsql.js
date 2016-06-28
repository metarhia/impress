'use strict';

// PgSQL database plugin for Impress Application Server
//
if (api.pgsql) {

  api.db.pgsql = {};
  api.db.drivers.pgsql = api.pgsql;

  // Open pgsql database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'postgres://username:password@host/database',
  //   tables: ['table1', 'table2', ...]
  // }, callback);
  //
  // callback after connection established
  //
  api.db.pgsql.open = function(database, callback) {

    database.retryCounter++;
    var application = database.application,
        connection = new api.pgsql.Client(database.url);
    connection.slowTime = database.slowTime;

    // api.db.pgsql.upgrade(connection);

    connection.connect(function(err) {
      if (err) {
        application.log.error(JSON.stringify(err));
        api.timers.setTimeout(function() {
          if (database.retryCounter <= database.retryCount) api.db.pgsql.open(database, callback);
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

  // Upgrade connection to comply Impress db library interface
  //
  api.db.pgsql.upgrade = function(connection) {

    connection.slowTime = 2000;

    api.common.override(connection, function query(sql, values, callback) {
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
  api.db.pgsql.schema = {};

  // Generate relational database schema for PgSQL
  //
  api.db.pgsql.schema.generateScript = function(databaseSchema, consoleOutput) {
  };

  // Execute multiple statements script for PgSQL
  //
  api.db.pgsql.schema.executeScript = function(target, script, callback) {
  };

}
