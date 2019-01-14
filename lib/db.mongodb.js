'use strict';

// MongoDB database connector for Impress Application Server

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
      const collections = database.config.collections;
      if (collections) {
        database.loadCollections(collections, callback);
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
      api.metasync.each(
        collections,
        (collectionName, next) => {
          con.collection(collectionName, (err, collection) => {
            if (!err) {
              database[collectionName] = collection;
              next();
              return;
            }
            con.createCollection(collectionName, (err, collection) => {
              if (err) {
                database.application.log.warn(
                  `Can not open collection: ${collectionName}`
                );
                next();
                return;
              }
              database[collectionName] = collection;
              next();
            });
          });
        },
        callback
      );
    };
  };
}
