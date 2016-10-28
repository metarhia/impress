'use strict';

// MongoDB database plugin for Impress Application Server
//
if (api.mongodb) {

  api.db.mongodb = {};
  api.db.mongodb.schema = {};
  api.db.drivers.mongodb = api.mongodb;

  var client = api.mongodb.MongoClient;

  // Open mongodb database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'mongodb://username:password@host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
  //   collections: ['collection1', 'collection2', ...] // optional
  // }, callback);
  //
  // callback after connection established
  //
  api.db.mongodb.open = function(database, callback) {
    client.connect(database.url, function(err, clientConnection) {
      if (!err) {
        database.connection = clientConnection;
        api.db.mongodb.mixinDatabase(database);
        if (database.collections) 
          database.loadCollections(database.collections, callback);
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
  api.db.mongodb.mixinDatabase = function(database) {

    // ObjectID from string: api.db.mongodb.oid(str)
    //
    database.oid = api.mongodb.ObjectID;

    database.Category = function(categoryName, callback) {
      var collection = database.connection.collection(categoryName);
      callback(null, new MongoCategory(collection));
    };

    // Load or create collections
    //
    database.loadCollections = function(collections, callback) {
      api.metasync.each(collections, function(collectionName, cb) {
        database.connection.collection(collectionName, function(err, collection) {
          if (!err) {
            database[collectionName] = collection;
            cb();
          } else database.connection.createCollection(collectionName, function(err, collection) {
            if (!err) database[collectionName] = collection;
            else impress.log.warning('Can not open collection: ' + collectionName);
            cb();
          });
        });
      }, callback);
    };

    // Generate database schema for MongoDB
    //
    database.generateSchema = function(databaseSchema, callback) {
      var validationResult = api.db.schema.validate(databaseSchema, true);
      console.log('Schema validation: ' + (validationResult.valid ? 'OK'.green : 'Error'.red.bold));
      if (validationResult.valid) {
        var steps = [],
            collection, collectionName, field, fieldName;
        for (collectionName in databaseSchema) {
          collection = databaseSchema[collectionName];
          if (typeof(collection) === 'object') {
            steps.push(closureEmptyCollection(collectionName));
            for (fieldName in collection.fields) {
              field = collection.fields[fieldName];
              if (field.index) steps.push(closureCreateIndex(collectionName, fieldName, field.index.unique));
            }
            if (collection.data) steps.push(closureInsertData(collectionName, collection.data));
          }
        }
        api.metasync.sequential(steps, function() {
          console.log('Done!'.green.bold);
          callback();
        });
      } else {
        console.log('Errors:');
        var errorKey;
        for (errorKey in validationResult.errors) console.log('  ' + validationResult.errors[errorKey].red.bold);
      }
      return {
        success: true, // TODO: return real success flag
        validation: validationResult
      };
    };

    // Create closure function for empty collection and
    //
    function closureEmptyCollection(collectionName) {
      return function(callback) {
        database.connection.collection(collectionName, function(err, collection) {
          if (!err) collection.remove({}, function(/* err, collection */) {
            console.log('  Collection: ' + database.name + '.' + collectionName.bold + ' ... empty');
            callback();
          }); else database.loadCollections([collectionName], function() {
            callback();
          });
        });
      };
    }

    // Create closure function for createIndex
    //
    function closureCreateIndex(collectionName, fieldName, unique) {
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
    function closureInsertData(collectionName, data) {
      return function(callback) {
        database.connection.collection(collectionName, function(err, collection) {
          if (!err) {
            console.log('  Inserting default data to: ' + database.name + '.' + collectionName.bold);
            collection.insert(data, callback);
          } else callback();
        });
      };
    }

  };

}

function MongoCategory(collection) {
  this.get = function(objectId, callback) {
    var mID = new api.mongodb.ObjectID(objectId);
    return collection.findOne({ _id: mID }, function(err, data) {
      if (err) return callback(err);
      callback(null, data);
    });
  };

  this.new = function(object, callback) {
    collection.insertOne(object, function(err, data) {
      console.log(err, data);
      callback(err, data.ops[0]._id);
    });
  };
}
