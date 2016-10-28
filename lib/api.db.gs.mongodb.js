'use strict';

// MongoDB storage provider for Global Storage
//

api.db.gs.mongodb = {};
  api.db.gs.schema = {};
  api.db.drivers.gs = api.gs;

  // Open globalstorage database
  //
  // Example:
  //
  // open({
  //   alias: 'gs',
  //   url: 'gs://metarhia.com/',
  //   storage: 'dbAlias'
  // }, callback);
  //
  // callback after connection established
  //
  api.db.gs.open = function(database, callback) {
    api.gs.connect(database.url, function(err, clientConnection) {
      if (!err) {
        database.connection = clientConnection;
        api.db.gs.mixinDatabase(database);
      }
      callback();
    });
  };

  // Load or create collections
  //
  api.db.gs.mixinDatabase = function(database) {

  };

}
