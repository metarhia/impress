'use strict';

// Memcached database plugin for Impress Application Server
//

var db = api.db;

api.memcached = api.impress.require('memcached');

if (api.memcached) {

  db.drivers.memcached = api.memcached;
  db.memcached = {};

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
  db.memcached.open = function(database, callback) {
    var url = database.url.replace('memcached://', '');
    database.connection = new api.memcached(url, database.options);
    callback();
  };

}
