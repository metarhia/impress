module.exports = function(client, callback) {

  client.context.data = { status: 0 };

  var items = [],
    path = client.fields.id.substring(1).split('/'),
    dbName = path[0],
    database = application.databases[dbName],
    schema = database.url.substr(0, database.url.indexOf(':')),
    driver = db[dbName];
  if (path.length == 2) {
    if (schema == 'mysql') {
      database.connection.query('DROP DATABASE '+db.escape(path[1]), [], function(err, result) {
        if (!err) client.context.data = { status: 1 };
        callback();
      });
    } else if (schema == 'mongodb') {
      var dbClient = db.drivers.mongodb.MongoClient,
        url = 'mongodb://localhost:27017/'+path[1];
      dbClient.connect(url, function(err, connection) {
        connection.dropDatabase(function(err, result) {
          if (!err) client.context.data = { status: 1 };
          connection.close();
          callback();
        });
      });
    } else callback();
  } else if (path.length == 3) {
    if (schema == 'mysql') {
      var tableName = path[1]+'.'+path[2];
      database.connection.query('DROP TABLE '+db.escape(tableName), [], function(err, result) {
        if (!err) client.context.data = { status: 1 };
        callback();
      });
    } else if (schema == 'mongodb') {
      var dbClient = db.drivers.mongodb.MongoClient,
        url = 'mongodb://localhost:27017/'+path[1];
      dbClient.connect(url, function(err, connection) {
        connection.dropCollection(path[2], function(err, result) {
          if (!err) client.context.data = { status: 1 };
          connection.close();
          callback();
        });
      });
    } else callback();
  }

}