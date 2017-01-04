'use strict';

// Memcached database plugin for Impress Application Server

if (api.memcached) {

  api.db.drivers.memcached = api.memcached;
  api.db.memcached = {};

  api.db.memcached.open = (
    database, // { name, url, options: { poolSize } }
    callback // callback after connection established
    // Example: {
    //   name: 'databaseName',
    //   url: 'memcached://host:port',
    //   options: { poolSize: 2000, ... }
    // }
  ) => {
    const url = database.url.replace('memcached://', '');
    // eslint-disable-next-line new-cap
    database.connection = new api.memcached(url, database.options);
    callback();
  };

}
