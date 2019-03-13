'use strict';

// MySQL database connector for Impress Application Server

const setupConnection = (database, connection, callback) => {
  connection.on('query', (err, res, fields, query) => {
    if (err) {
      database.application.log.error(
        `MySQL Error[${err.errno}]: ${err.code} ${query.sql}`
      );
    }
    database.application.log.debug(query.sql);
  });

  connection.on('slow', (err, res, fields, query, executionTime) => {
    database.application.log.slow(`${executionTime}ms ${query.sql}`);
  });

  connection.on('error', err => {
    database.application.logException(err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      if (database.retryCounter <= database.retryCount) {
        api.db.mysql.open(database, callback);
      }
    }
  });
};

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

    if (api.mysqlUtilities) {
      api.db.mysql.upgrade(connection);
      api.db.mysql.introspection(connection);
    }

    connection.connect(err => {
      if (err) {
        database.application.logException(err);
        setTimeout(() => {
          if (database.retryCounter <= database.retryCount) {
            api.db.mysql.open(database, callback);
          } else {
            callback(new Error('Cannot open connection'));
          }
        }, database.retryInterval);
        return;
      }
      database.retryCounter = 0;
      setupConnection(database, connection, callback);
      database.connection = connection;
      callback();
    });
  };

}
