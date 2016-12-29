'use strict';

// Memcached database plugin for Impress Application Server
//
if (api.memcached) {

  api.db.drivers.memcached = api.memcached;
  api.db.memcached = {};

  // Open memcached database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'memcached://host:port',
  //   options: { poolSize:2000, ... }
  // }, callback);
  //
  // callback after connection established
  //
  api.db.memcached.open = (database, callback) => {
    let url = database.url.replace('memcached://', '');
    // eslint-disable-next-line new-cap
    database.connection = new api.memcached(url, database.options);
    callback();
  };

}
