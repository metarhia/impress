'use strict';

// MongoDB database plugin for Impress Application Server
//
if (api.mongodb) {

  api.db.mongodb = {};
  api.db.mongodb.schema = {};
  api.db.drivers.mongodb = api.mongodb;

  const client = api.mongodb.MongoClient;

  // Open mongodb database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'mongodb://username:password@host1
  //     [:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
  //   collections: ['collection1', 'collection2', ...] // optional
  // }, callback);
  //
  // callback after connection established
  //
  api.db.mongodb.open = (database, callback) => {
    client.connect(database.url, (err, con) => {
      if (!err) {
        database.connection = con;
        api.db.mongodb.mixinDatabase(database);
        if (database.config.collections) {
          database.loadCollections(database.config.collections, callback);
        } else {
          con.collections((err, collections) => {
            database.collections = collections.map(
              collection => collection.collectionName
            );
            database.loadCollections(database.collections, callback);
          });
        }
      } else callback();
    });
  };

  // Load or create collections
  //
  api.db.mongodb.mixinDatabase = (database) => {

    // ObjectID from string: api.db.mongodb.oid(str)
    //
    database.oid = api.mongodb.ObjectID;

    // Load or create collections
    //
    database.loadCollections = (collections, callback) => {
      let con = database.connection;
      api.metasync.each(collections, (collectionName, cb) => {
        con.collection(collectionName, (err, collection) => {
          if (!err) {
            database[collectionName] = collection;
            cb();
          } else {
            con.createCollection(collectionName, (err, collection) => {
              if (!err) database[collectionName] = collection;
              else impress.log.warning(
                'Can not open collection: ' + collectionName
              );
              cb();
            });
          }
        });
      }, callback);
    };

    // Generate database schema for MongoDB
    //
    database.generateSchema = (databaseSchema, callback) => {
      let validationResult = api.db.schema.validate(databaseSchema, true);
      let res = validationResult.valid ? 'OK'.green : 'Error'.red.bold;
      console.log('Schema validation: ' + res);
      if (validationResult.valid) {
        let steps = [],
            collection, collectionName, field, fieldName;
        for (collectionName in databaseSchema) {
          collection = databaseSchema[collectionName];
          if (typeof(collection) === 'object') {
            steps.push(closureEmptyCollection(collectionName));
            for (fieldName in collection.fields) {
              field = collection.fields[fieldName];
              if (field.index) {
                steps.push(closureCreateIndex(
                  collectionName, fieldName, field.index.unique
                ));
              }
            }
            if (collection.data) {
              steps.push(closureInsertData(
                collectionName, collection.data
              ));
            }
          }
        }
        api.metasync.sequential(steps, () => {
          console.log('Done!'.green.bold);
          callback();
        });
      } else {
        console.log('Errors:');
        let errorKey;
        for (errorKey in validationResult.errors) {
          console.log('  ' + validationResult.errors[errorKey].red.bold);
        }
      }
      return {
        success: true, // TODO: return real success flag
        validation: validationResult
      };
    };

    // Create closure function for empty collection and
    //
    function closureEmptyCollection(collectionName) {
      let con = database.connection;
      return (callback) => {
        con.collection(collectionName, (err, collection) => {
          if (!err) {
            collection.remove({}, (/* err, collection */) => {
              console.log(
                '  Collection: ' + database.name + '.' +
                collectionName.bold + ' ... empty'
              );
              callback();
            });
          } else {
            database.loadCollections([collectionName], () => {
              callback();
            });
          }
        });
      };
    }

    // Create closure function for createIndex
    //
    function closureCreateIndex(collectionName, fieldName, unique) {
      let con = database.connection;
      return (callback) => {
        con.collection(collectionName, (err, collection) => {
          if (!err) {
            let idx = {};
            idx[fieldName] = 1;
            collection.createIndex(idx, { unique: unique }, callback);
          } else callback();
        });
      };
    }

    // Create closure function for insert
    //
    function closureInsertData(collectionName, data) {
      let con = database.connection;
      return (callback) => {
        con.collection(collectionName, (err, collection) => {
          if (!err) {
            console.log(
              '  Inserting default data to: ' +
              database.name + '.' + collectionName.bold
            );
            collection.insert(data, callback);
          } else callback();
        });
      };
    }

  };

}
