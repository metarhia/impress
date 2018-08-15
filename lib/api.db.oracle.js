'use strict';

// Oracle database plugin for Impress Application Server

if (api.oracle) {
  api.db.oracle = {};
  api.db.drivers.oracle = api.oracle;

  api.db.oracle.open = (
    database, // { name, url, tables }
    callback // callback after connection established
  ) => {
    const url = database.url.replace('oracle://', '');
    const [auth, connectString] = url.split('@');
    const [user, password] = auth.split(':');
    database.retryCounter++;
    api.oracle.getConnection({
      user, password, connectString
    }, (err, connection) => {
      if (err) {
        impress.log.error(api.json.stringify(err));
        api.timers.setTimeout(() => {
          if (database.retryCounter <= database.retryCount) {
            api.db.oracle.open(database, callback);
          }
        }, database.retryInterval);
        return;
      }
      database.retryCounter = 0;
      connection.slowTime = database.slowTime;
      database.connection = connection;

      database.query = (sql, values, callback) => {
        const startTime = Date.now();
        if (typeof values === 'function') {
          callback = values;
          values = [];
        }
        connection.execute(sql, values, (err, res) => {
          if (err) {
            impress.log.error(api.json.stringify(err));
            return;
          }
          const endTime = Date.now();
          const executionTime = endTime - startTime;

          connection.emit('query', err, res, sql);
          if (connection.slowTime && executionTime >= connection.slowTime) {
            connection.emit('slow', err, res, sql, executionTime);
          }
          if (callback) callback(err, res);
        });
      };

      callback();
    });
  };

}
