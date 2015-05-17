'use strict';

var driver = impress.require('mongodb');

if (driver) {

  db.mongodb = {};
  db.drivers.mongodb = driver;

  var client = driver.MongoClient;

  // ObjectID from string: db.mongodb.oid(str)
  //
  db.mongodb.oid = db.drivers.mongodb.ObjectID;

  // Open mongodb database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'mongodb://username:password@host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
  //   collections: [ 'collection1', 'collection2', ... ] // optional
  // }, callback);
  //
  // callback after connection established
  //
  db.mongodb.open = function(database, callback) {
    client.connect(database.url, function(err, clientConnection) {
      if (!err) {
        database.connection = clientConnection;
        database.oid = db.mongodb.oid;
        if (database.collections) db.mongodb.loadCollections(database, callback);
        else {
          database.connection.collections(function(err, collections) {
            database.collections = collections.map(function(collection) {
              return collection.collectionName;
            });
            db.mongodb.loadCollections(database, callback);
          });
        }
      } else callback();
    });
  };

  db.mongodb.loadCollections = function(database, callback) {
    api.async.each(database.collections, function(collectionName, cb) {
      database.connection.collection(collectionName, function(err, collection) {
        if (!err) {
          database[collectionName] = collection;
          cb();
        } else clientConnection.createCollection(collectionName, function(err, collection) {
          if (!err) database[collectionName] = collection;
          else console.log('Can not open collection: ' + collectionName);
          cb();
        });
      });
    }, callback);
  };

  if (db.schema) require('./db.mongodb.schema');

}
