'use strict';

// GlobalStorage database plugin for Impress Application Server
//
if (api.gs) {

  api.db.gs = {};
  api.db.gs.schema = {};
  api.db.drivers.gs = api.gs;

  // Open globalstorage database
  //
  // Example:
  //
  // open({
  //   alias: 'gs',
  //   url: 'gs://metarhia.com/',
  //   storage: 'dbName'
  // }, callback);
  //
  // callback after connection established
  //
  api.db.gs.open = function(database, callback) {
    var application = database.application;
    application.on('databasesOpened', function() {
      api.gs.localStorageProvider = new api.gs.MongodbProvider({
        connection: application.databases[database.config.storage].connection,
        gs: api.gs
      });
      api.gs.localStorageProvider.open(function() {
        api.gs.open(function(err) {
          if (!err) api.db.gs.mixinDatabase(database);
        });
      });
    });
    database.connection = api.gs;
    callback();
  };

  // Load or create collections
  //
  api.db.gs.mixinDatabase = function(database) {

  };

}
