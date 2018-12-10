'use strict';

// MongoDB database plugin for Impress Application Server

if (api.mongodb) {

  api.db.mongodb = {};
  api.db.drivers.mongodb = api.mongodb;

  const client = api.mongodb.MongoClient;

  // Open
  //   database <Object> { name, url, collections }
  //   callback <Function> callback after connection established
  api.db.mongodb.open = (database, callback) => {
    const dbName = database.url.split('/').pop();
    client.connect(database.url, { useNewUrlParser: true }, (err, con) => {
      if (err) {
        callback(err);
        return;
      }
      const connection = con.db(dbName);
      database.connection = connection;
      api.db.mongodb.mixinDatabase(database);
      if (database.config.collections) {
        database.loadCollections(database.config.collections, callback);
        return;
      }
      connection.collections((err, collections) => {
        if (err) {
          callback(err);
          return;
        }
        database.collections = collections.map(
          collection => collection.collectionName
        );
        database.loadCollections(database.collections, callback);
      });
    });
  };

  api.db.mongodb.mixinDatabase = database => {

    database.oid = api.mongodb.ObjectID;

    // Load Collections
    //   collections <string[]>
    //   callback <Function>
    database.loadCollections = (collections, callback) => {
      const con = database.connection;
      api.metasync.each(collections, (collectionName, cb) => {
        con.collection(collectionName, (err, collection) => {
          if (!err) {
            database[collectionName] = collection;
            cb();
            return;
          }
          con.createCollection(collectionName, (err, collection) => {
            if (err) {
              impress.log.warn(`Can not open collection: ${collectionName}`);
              return;
            }
            database[collectionName] = collection;
            cb();
          });
        });
      }, callback);
    };

  };

}
