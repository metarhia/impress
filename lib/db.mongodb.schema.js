'use strict';

db.mongodb.schema = {};

function closureEmptyCollection(database, collectionName) {
  return function(callback) {
    database.connection.collection(collectionName, function(err, collection) {
      if (!err) {
        collection.remove({}, function(err, collection) {
          console.log('  Collection: ' + database.name + '.' + collectionName.bold + ' ... deleted');
          callback();
        });
      } else {
        clientConnection.createCollection(collectionName, function(err, collection) {
          callback();
        });
      }
    });
  }
}

function closureCreateIndex(database, collectionName, fieldName, unique) {
  return function(callback) {
    database.connection.collection(collectionName, function(err, collection) {
      if (!err) {
        var idx = {};
        idx[fieldName] = 1;
        collection.createIndex(idx, { unique: unique }, callback);
      } else callback();
    });
  }
}

function closureInsertData(database, collectionName, data) {
  return function(callback) {
    database.connection.collection(collectionName, function(err, collection) {
      if (!err) {
        console.log('  Inserting default data to: ' + database.name + '.' + collectionName.bold);
        collection.insert(data, callback);
      } else callback();
    });
  }
}

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
