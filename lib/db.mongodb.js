'use strict';

// MongoDB database plugin for Impress Application Server

if (api.mongodb) {

  api.db.mongodb = {};
  api.db.mongodb.schema = {};
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

    database.generateSchema = (databaseSchema, callback) => {
      const validationResult = api.db.schema.validate(databaseSchema, true);
      const res = validationResult.valid ? 'OK' : 'ERROR';
      impress.log.info('Schema validation: ' + res);
      if (validationResult.valid) {
        const steps = [];
        for (const collectionName in databaseSchema) {
          const collection = databaseSchema[collectionName];
          if (typeof collection === 'object') {
            steps.push(closureEmptyCollection(collectionName));
            for (const fieldName in collection.fields) {
              const field = collection.fields[fieldName];
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
          impress.log.info('DONE');
          callback();
        });
      } else {
        const errors = validationResult.errors.join('; ');
        impress.log.error('Errors: ' + errors);
      }
      return {
        success: true,
        validation: validationResult
      };
    };

    function closureEmptyCollection(collectionName) {
      const con = database.connection;
      return callback => {
        con.collection(collectionName, (err, collection) => {
          if (err) {
            database.loadCollections([collectionName], callback);
            return;
          }
          collection.remove({}, (err /*collection*/) => {
            if (err) {
              callback(err);
              return;
            }
            impress.log.error(
              `Collection: ${database.name}.${collectionName} ... empty`
            );
            callback();
          });
        });
      };
    }

    function closureCreateIndex(collectionName, fieldName, unique) {
      const con = database.connection;
      return callback => {
        con.collection(collectionName, (err, collection) => {
          if (err) {
            callback(err);
            return;
          }
          const idx = {};
          idx[fieldName] = 1;
          collection.createIndex(idx, { unique }, callback);
        });
      };
    }

    function closureInsertData(collectionName, data) {
      const con = database.connection;
      return callback => {
        con.collection(collectionName, (err, collection) => {
          if (err) {
            callback();
            return;
          }
          impress.log.error(
            `Inserting default data to: ${database.name}.${collectionName}`
          );
          collection.insert(data, callback);
        });
      };
    }

  };

}
