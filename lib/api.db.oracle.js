'use strict';

// Oracle database plugin for Impress Application Server

if (api.oracle) {
  api.db.oracle = {};
  api.db.drivers.oracle = api.oracle;

  api.db.oracle.open = (
    database, // { name, url, tables }
    callback // callback after connection established
    // Example: {
    //   name: 'databaseName',
    //   url: 'postgres://username:password@host/database',
    //   tables: ['table1', 'table2', ...]
    // }
  ) => {
    const url = database.url.replace('oracle://', '');
    const [auth, connectString] = url.split('@');
    const [user, password] = auth.split(':');
    database.retryCounter++;
    console.dir({
      user, password, connectString
    });
    api.oracle.getConnection({
      user, password, connectString
    }, (err, connection) => {
      if (err) {
        impress.log.error(err);
        api.timers.setTimeout(() => {
          if (database.retryCounter <= database.retryCount) {
            api.db.oracle.open(database, callback);
          }
        }, database.retryInterval);
        return;
      }
      connection.slowTime = database.slowTime;
      impress.log.debug(JSON.stringify(connection));
      database.connection = connection;
      callback();
    });
  };

}
