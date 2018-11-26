'use strict';

// Oracle database plugin for Impress Application Server

if (api.oracle) {

  api.db.oracle = {};
  api.db.drivers.oracle = api.oracle;

  // Open Database
  //   database <Object> { name, url, tables }
  //   callback <Function> callback after connection established
  api.db.oracle.open = (database, callback) => {
    const url = database.url.replace('oracle://', '');
    const [auth, connectString] = url.split('@');
    const [user, password] = auth.split(':');
    const { poolMax } = database;
    database.retryCounter++;
    api.oracle.createPool({
      user, password, connectString, poolMax
    }, (err, pool) => {
      if (err) {
        impress.log.error(api.json.stringify(err));
        setTimeout(() => {
          if (database.retryCounter <= database.retryCount) {
            api.db.oracle.open(database, callback);
          }
        }, database.retryInterval);
        return;
      }
      database.retryCounter = 0;
      database.pool = pool;

      database.query = (sql, values, callback) => {
        if (typeof values === 'function') {
          callback = values;
          values = [];
        }
        pool.getConnection((err, connection) => {
          if (err) {
            impress.log.error(api.json.stringify(err));
            callback(err);
            return;
          }
          const startTime = Date.now();
          connection.execute(sql, values, (err, res) => {
            if (err) {
              impress.log.error(api.json.stringify(err));
              callback(err);
              return;
            }
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            pool.emit('query', err, res, sql);
            if (database.slowTime && executionTime >= database.slowTime) {
              pool.emit('slow', err, res, sql, executionTime);
            }
            if (callback) callback(err, res);
            connection.release();
          });
        });
      };

      callback();
    });
  };

  api.db.oracle.close = (database, callback) => {
    database.pool.close(callback);
  };

}
