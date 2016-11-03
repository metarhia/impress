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
    console.log('---1');
    var application = database.application;
    application.on('databasesOpened', function() {
      console.log('---2');
      var db = application.databases[database.config.storage];
      api.gs.open({
        gs: api.gs,
        provider: db.schema,
        connection: db ? db.connection : null
      }, function(err) {
        console.log('---3');
        if (!err) api.db.gs.mixinDatabase(database);
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
