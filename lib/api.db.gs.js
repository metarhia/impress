'use strict';

// MongoDB database plugin for Impress Application Server
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
  //   name: 'databaseName',
  //   url: 'gs://username:password@host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
  //   collections: ['collection1', 'collection2', ...] // optional
  // }, callback);
  //
  // callback after connection established
  //
  api.db.gs.open = function(database, callback) {
    client.connect(database.url, function(err, clientConnection) {
      if (!err) {
        database.connection = clientConnection;
        api.db.gs.mixinDatabase(database);
        if (database.collections) database.loadCollections(database.collections, callback);
        else {
          database.connection.collections(function(err, collections) {
            database.collections = collections.map(function(collection) {
              return collection.collectionName;
            });
            database.loadCollections(database.collections, callback);
          });
        }
      } else callback();
    });
  };

  // Load or create collections
  //
  api.db.gs.mixinDatabase = function(database) {

  };

}
