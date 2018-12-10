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
    const config = database.config;
    api.gs.open(config, err => {
      if (err) {
        impress.log.warn(
          'Can\'t open database: ' + database.name +
          ' in application: ' + application.name
        );
        return;
      }
      database.connection = api.gs;
      callback();
    });

  };

}
