'use strict';

// PgSQL database plugin for Impress Application Server

if (api.pgsql) {

  api.db.pgsql = {};
  api.db.drivers.pgsql = api.pgsql;

  // Open Database
  //   database <Object> { name, url, tables }
  //   callback <Function> callback after connection established
  api.db.pgsql.open = (database, callback) => {
    database.retryCounter++;
    const connection = new api.pgsql.Client(database.url);
    connection.slowTime = database.slowTime;

    // api.db.pgsql.upgrade(connection);

    connection.connect(err => {
      if (err) {
        impress.log.error(api.json.stringify(err));
        setTimeout(() => {
          if (database.retryCounter <= database.retryCount) {
            api.db.pgsql.open(database, callback);
          }
        }, database.retryInterval);
      }
      database.retryCounter = 0;
    });

    connection.on('query', (err, res, query) => {
      if (err) {
        const error = err.stack || err.toString();
        impress.log.error(
          `PgSQL Error[${err.code}]: ${error}\t${query.text}`
        );
      }
      impress.log.debug(query.text);
    });

    connection.on('slow', (err, res, query, executionTime) => {
      impress.log.slow(executionTime + 'ms\t' + query.text);
    });

    connection.on('error', err => {
      impress.log.error(api.json.stringify(err));
    });

    database.connection = connection;
    callback();
  };

  api.db.pgsql.upgrade = connection => {

    connection.slowTime = 2000;

    api.common.override(connection, function query(sql, values, callback) {
      const startTime = Date.now();
      if (typeof values === 'function') {
        callback = values;
        values = [];
      }
      const aQuery = query.inherited(sql, values, (err, res) => {
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        connection.emit('query', err, res, aQuery);
        if (connection.slowTime && executionTime >= connection.slowTime) {
          connection.emit('slow', err, res, aQuery, executionTime);
        }
        if (callback) callback(err, res);
      });
      return aQuery;
    });

  };

}
