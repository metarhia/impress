'use strict';

// GlobalStorage database plugin for Impress Application Server

if (api.gs) {

  api.db.gs = {};
  api.db.gs.schema = {};
  api.db.drivers.gs = api.gs;

  // Open Globalstorage
  //   database <Object> config { alias, url, storage }
  //   callback <Function>
  // Example: { alias: 'gs', url: 'gs://metarhia.com/', storage: 'dbName' }
  api.db.gs.open = (database, callback) => {
    const application = database.application;
    application.on('databasesOpened', () => {
      const config = database.config;
      if (config.path) config.provider = 'fs';
      const db = application.databases[config.storage];
      if (db) {
        config.gs = api.gs;
        config.db = db.connection;
        config.provider = db.schema;
        database.connection = api.gs;
      }
      api.gs.open(config, err => {
        if (err) {
          impress.log.warn('Can\'t open database: ' + database.name);
          return;
        }
        api.db.gs.mixinDatabase(database);
      });
    });
    callback();
  };

  api.db.gs.mixinDatabase = () => {};

}
