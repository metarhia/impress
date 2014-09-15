module.exports = function(client, callback) {

  client.context.data = { status:0 };

  if (client.fields.source) {
    var path = client.fields.source.substring(1).split('/'),
      dbName = path[0],
      database = application.databases[dbName],
      url = database.url,
      schema = url.substr(0, url.indexOf(':')),
      driver = db[dbName];
    if (path.length >= 2) {
      if (schema == 'mysql') {
        var query = database.connection.query(client.fields.sql, [], function(err, result) {
          var msg = '';
          if (result && result.message) msg = result.message.replace('(', '');
          else if (result && Array.isArray(result)) msg = result.length+' row(s)';
          else if (err && err.code) msg = 'Error ['+err.errno+']: '+err.code;
          client.context.data = { status:1, msg:msg };
          callback();
        });
      } else callback();
    } else callback();
  } else callback();

}