'use strict';

// MySQL database connector for Impress Application Server

if (api.mysql) {

  api.db.mysql = {};
  api.db.drivers.mysql = api.mysql;

  if (api.mysqlUtilities) {
    api.db.mysql.upgrade = api.mysqlUtilities.upgrade;
    api.db.mysql.introspection = api.mysqlUtilities.introspection;
  }

  // Open Database
  //   database <Object> { name, url, tables }
  //   callback <Function> callback after connection established
  api.db.mysql.open = (database, callback) => {
    database.retryCounter++;
    const connection = api.mysql.createConnection(database.url);
    connection.slowTime = database.slowTime;

    api.db.mysql.upgrade(connection);
    if (api.db.mysql.introspection) {
      api.db.mysql.introspection(connection);
    }

    connection.connect(err => {
      if (err) {
        impress.log.error(err);
        setTimeout(() => {
          if (database.retryCounter <= database.retryCount) {
            api.db.mysql.open(database, callback);
          }
        }, database.retryInterval);
      }
      database.retryCounter = 0;
    });

    connection.on('query', (err, res, fields, query) => {
      if (err) {
        impress.log.error(
          `MySQL Error[${err.errno}]: ${err.code}\t${query.sql}`
        );
      }
      impress.log.debug(query.sql);
    });

    connection.on('slow', (err, res, fields, query, executionTime) => {
      impress.log.slow(`${executionTime}ms\t${query.sql}`);
    });

    connection.on('error', err => {
      impress.log.error(err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        if (database.retryCounter <= database.retryCount) {
          api.db.mysql.open(database, callback);
        }
      }
    });

    database.connection = connection;
    callback();
  };

}
