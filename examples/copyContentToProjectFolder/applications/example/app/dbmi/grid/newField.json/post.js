module.exports = function(client, callback) {

  client.context.data = { status:0 };

  var path = client.fields.source.substring(1).split('/'),
    dbName = path[0],
    url = application.databases[dbName].url,
    schema = url.substr(0, url.indexOf(':')),
    driver = db[dbName];
  if (path.length == 3) {
    if (schema == 'mysql') {
      /*
      var tableName = path[1]+'.'+path[2];
      database.connection.insert(tableName, data, function(err, recordId, query) {
        if (!err) {
          var sql = query.sql.replace(path[1]+'.', ''); // replace(/`/g, '').
          client.context.data = {
            status: recordId>0 ? 1 : 0,
            sql: sql
          };
          if (recordId) {
            database.connection.fields(tableName, function(err, fields) {
              if (!err) {
                var uniqueKey = null;
                for (var i in fields) {
                  var field = fields[i],
                    fieldName = field['Field'];
                  if (!uniqueKey && (field['Key']=='PRI' || field['Key']=='UNI')) uniqueKey = fieldName;
                }
                if (uniqueKey) {
                  var where = {};
                  where[uniqueKey] = recordId;
                  where = database.connection.where(where);
                  database.connection.queryRow('SELECT * FROM '+db.escape(tableName)+' WHERE '+where, [], function(err, data) {
                    if (!data) data = [];
                    client.context.data.data = data;
                    callback();
                  });
                } else callback();
              } else callback();
            });
          } else callback();
        } else callback();
      });
      */
      callback();
    } else if (schema == 'mongodb') {
      var dbClient = db.drivers.mongodb.MongoClient,
        url = 'mongodb://localhost:27017/'+path[1];
      dbClient.connect(url, function(err, connection) {
        connection.createCollection(path[2], function(err, collection) {
          var objectId = client.fields.pkValue;
          if (objectId.length == 24) objectId = db.mongodb.oid(objectId);
          var data = {};
          data[client.fields.newFieldName] = '';
          collection.update({ _id: objectId }, { $set: data },  function(err) {
            if (!err) client.context.data = { status: 1 };
            callback();
          });
          connection.close();
        });
      });
    } else callback();
  } else callback();

}