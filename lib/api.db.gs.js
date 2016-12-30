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
  api.db.gs.open = (database, callback) => {
    const application = database.application;
    application.on('databasesOpened', () => {
      const config = database.config;
      if (config.path) config.provider = 'fs';
      const db = application.databases[config.storage];
      if (db) {
        config.gs = api.gs;
        config.provider = db.schema;
        config.connection = db.connection;
      }
      api.gs.open(config, (err) => {
        if (!err) api.db.gs.mixinDatabase(database);
      });
    });
    database.connection = api.gs;
    callback();
  };

  // Load or create collections
  //
  api.db.gs.mixinDatabase = (database) => {
  };

}
