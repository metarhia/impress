module.exports = function(client, callback) {

  client.context.data = { status: 0 };

  var items = [],
    path = client.fields.id.substring(1).split('/'),
    dbName = path[0],
    database = application.databases[dbName],
    schema = database.url.substr(0, database.url.indexOf(':')),
    driver = db[dbName];
  if (path.length == 1) {
    if (schema == 'mysql') {
      database.connection.query('CREATE DATABASE '+db.escape(client.fields.title), [], function(err, result) {
        if (!err) client.context.data = { status: 1, id: client.fields.id+'/'+client.fields.title };
        callback();
      });
    } else if (schema == 'mongodb') {
      var dbClient = db.drivers.mongodb.MongoClient,
        url = 'mongodb://localhost:27017/'+client.fields.title;
      dbClient.connect(url, function(err, connection) {
        client.context.data = { status: 1, id: client.fields.id+'/'+client.fields.title };
        connection.close();
        callback();
      });
    } else callback();
  } else if (path.length == 2) {
    if (schema == 'mysql') {
      database.connection.query('CREATE TABLE '+db.escape(path[1]+'.'+client.fields.title), [], function(err, result) {
        if (!err) client.context.data = { status: 1 };
        callback();
      });
    } else if (schema == 'mongodb') {
      var dbClient = db.drivers.mongodb.MongoClient,
        url = 'mongodb://localhost:27017/'+path[1];
      dbClient.connect(url, function(err, connection) {
        connection.createCollection(client.fields.title, function(err, result) {
          if (!err) client.context.data = { status: 1 };
          connection.close();
          callback();
        });
      });
    } else callback();
  }

}