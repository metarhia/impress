'use strict';

var driver = api.impress.require('mongodb');

if (driver) {

  db.mongodb = {};
  db.mongodb.schema = {};
  db.drivers.mongodb = driver;

  var client = driver.MongoClient;

  // ObjectID from string: db.mongodb.oid(str)
  //
  db.mongodb.oid = driver.ObjectID;

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
        } else database.connection.createCollection(collectionName, function(err, collection) {
          if (!err) database[collectionName] = collection;
          else console.log('Can not open collection: ' + collectionName);
          cb();
        });
      });
    }, callback);
  };

  // Generate database schema for MongoDB
  //
  db.mongodb.schema.generateSchema = function(database, databaseSchema, consoleOutput) {
    var validationResult = db.schema.validate(databaseSchema, consoleOutput);
    if (consoleOutput) console.log('Schema validation: ' + (validationResult.valid ? 'OK'.green : 'Error'.red.bold));
    if (validationResult.valid) {
      var steps = [],
          collection, collectionName, field, fieldName;
      for (collectionName in databaseSchema) {
        if (collectionName !== 'caption' && collectionName !== 'version') {
          collection = databaseSchema[collectionName];
          steps.push(closureEmptyCollection(database, collectionName));
          for (fieldName in collection.fields) {
            field = collection.fields[fieldName];
            if (field.index) steps.push(closureCreateIndex(database, collectionName, fieldName, field.index.unique));
          }
          if (collection.data) steps.push(closureInsertData(database, collectionName, collection.data));
        }
      }
      steps.push(function(callback) {
        //database.connection.indexInformation(function(err, indexes) {
        //  console.dir({ indexes: indexes });
          callback();
        //});
      });
      api.async.series(steps, function() {
        console.log('Done!'.green.bold);
      });
    } else if (consoleOutput) {
      console.log('Errors:');
      var errorKey;
      for (errorKey in validationResult.errors) console.log('  ' + validationResult.errors[errorKey].red.bold);
    }
    return {
      success:    true, // TODO: return real success flag
      validation: validationResult
    };
  };

}

// Create closure function for empty collection and
//
function closureEmptyCollection(database, collectionName) {
  return function(callback) {
    database.connection.collection(collectionName, function(err, collection) {
      if (!err) {
        collection.remove({}, function(/* err, collection */) {
          console.log('  Collection: ' + database.name + '.' + collectionName.bold + ' ... deleted');
          callback();
        });
      } else {
        database.connection.createCollection(collectionName, function(/* err, collection */) {
          callback();
        });
      }
    });
  };
}

// Create closure function for createIndex
//
function closureCreateIndex(database, collectionName, fieldName, unique) {
  return function(callback) {
    database.connection.collection(collectionName, function(err, collection) {
      if (!err) {
        var idx = {};
        idx[fieldName] = 1;
        collection.createIndex(idx, { unique: unique }, callback);
      } else callback();
    });
  };
}

// Create closure function for insert
//
function closureInsertData(database, collectionName, data) {
  return function(callback) {
    database.connection.collection(collectionName, function(err, collection) {
      if (!err) {
        console.log('  Inserting default data to: ' + database.name + '.' + collectionName.bold);
        collection.insert(data, callback);
      } else callback();
    });
  };
}
