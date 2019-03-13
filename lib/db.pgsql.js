'use strict';

// PgSQL database connector for Impress Application Server

const setupConnection = (database, connection, slowTime) => {
  const { query } = connection;
  connection.query = (sql, values, callback) => {
    const startTime = Date.now();
    if (typeof values === 'function') {
      callback = values;
      values = [];
    }
    const aQuery = query(sql, values, (err, res) => {
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      connection.emit('query', err, res, aQuery);
      if (slowTime && executionTime >= slowTime) {
        connection.emit('slow', err, res, aQuery, executionTime);
      }
      if (callback) callback(err, res);
    });
    return aQuery;
  };

  connection.on('query', (err, res, query) => {
    if (err) {
      database.application.log.error(
        `PgSQL Error[${err.code}]: ${err.stack} ${query.text}`
      );
    }
    database.application.log.debug(query.text);
  });

  connection.on('slow', (err, res, query, executionTime) => {
    database.application.log.slow(`${executionTime}ms ${query.text}`);
  });

  connection.on('error', err => {
    database.application.logException(err);
  });
};

if (api.pgsql) {

  api.db.pgsql = {};
  api.db.drivers.pgsql = api.pgsql;

  // Open Database
  //   database <Object> { name, url }
  //   callback <Function> callback after connection established
  api.db.pgsql.open = (database, callback) => {
    database.retryCounter++;
    const connection = new api.pgsql.Client(database.url);
    const slowTime = database.slowTime || 2000;

    connection.connect(err => {
      if (err) {
        database.application.logException(err);
        setTimeout(() => {
          if (database.retryCounter <= database.retryCount) {
            api.db.pgsql.open(database, callback);
          } else {
            callback(new Error('Cannot open connection'));
          }
        }, database.retryInterval);
        return;
      }
      database.retryCounter = 0;
      setupConnection(database, connection, slowTime);
      database.connection = connection;
      callback();
    });
  };

}
