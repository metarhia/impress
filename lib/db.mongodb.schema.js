"use strict";

db.mongodb.schema = {};

function closureEmptyCollection(database, collectionName) {
  return function(callback) {
    database.remove({}, function(err, collection) {
      console.log('  Collection: '+database.name+'.'+collectionName.bold+' ... deleted');
      callback();
    });
  }
}

function closureCreateIndex(database, collectionName, fieldName, unique) {
  return function(callback) {
    var idx = {};
    idx[fieldName] = 1;
    database.createIndex(idx, { unique: unique }, callback);
  }
}

function closureInsertData(database, collectionName, data) {
  return function(callback) {
    console.log('  Inserting default data to: '+database.name+'.'+collectionName.bold);
    database.collection.insert(data, callback);
  }
}

// Generate database schema for MongoDB
//
db.mongodb.schema.generateSchema = function(database, databaseSchema, consoleOutput) {
  var validationResult = db.schema.validate(databaseSchema, consoleOutput);
  if (consoleOutput) console.log('Schema validation: '+(validationResult.valid ? 'OK'.green : 'Error'.red));
  if (validationResult.valid) {
    var steps = [],
        collection, collectionName, field, fieldName;
    for (collectionName in databaseSchema) {
      if (collectionName !== 'caption' && collectionName !== 'version') {
        collection = databaseSchema[collectionName];
        steps.push(closureEmptyCollection(application, database, collectionName));
        for (fieldName in collection.fields) {
          field = collection.fields[fieldName];
          if (field.index) steps.push(closureCreateIndex(database, collectionName, fieldName, field.index.unique));
        }
        if (collection.data) steps.push(closureInsertData(database, collectionName, data));
      }
    }
    steps.push(function(callback) {
      database.connection.indexInformation(function(err, indexes) {
        console.dir({ indexes: indexes });
        callback();
      });
    });
    api.async.series(steps, function() {
      console.log('Done!'.green.bold);
    });
  } else if (consoleOutput) {
    console.log('Errors:');
    for (var i in validationResult.errors) console.log('  '+validationResult.errors[i].red);
  }
  return {
    success:    true, // TODO: return real success flag
    validation: validationResult
  };
};
