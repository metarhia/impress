module.exports = function(client, callback) {

  client.context.data = { status: 0 };

  var items = [],
    path = client.fields.source.substring(1).split('/'),
    dbName = path[0],
    database = application.databases[dbName],
    schema = database.url.substr(0, database.url.indexOf(':')),
    driver = db[dbName];
  if (path.length == 3) {
    if (schema == 'mysql') {
      var tableName = path[1]+'.'+path[2];
      var query = database.connection.query('DELETE FROM '+db.escape(tableName)+' WHERE '+client.fields.pkName+'=?', [client.fields.pkValue], function(err, result) {
        if (!err) {
          var sql = query.sql.replace(path[1]+'.', ''); // replace(/`/g, '').
          client.context.data = { status: 1, sql: sql };
        }
        callback();
      });
    } else if (schema == 'mongodb') {
      var dbClient = db.drivers.mongodb.MongoClient,
        url = 'mongodb://localhost:27017/'+path[1];
      dbClient.connect(url, function(err, connection) {
        connection.createCollection(path[2], function(err, collection) {
          var objectId = client.fields.pkValue;
          if (objectId.length == 24) objectId = db.mongodb.oid(objectId);
          collection.remove({ _id: objectId }, function(err, collection) {
            if (!err) client.context.data = { status: 1 };
            connection.close();
            callback();
          });
        });
      });
    } else callback();
  } else callback();

}