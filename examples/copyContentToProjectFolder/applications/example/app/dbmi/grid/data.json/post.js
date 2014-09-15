module.exports = function(client, callback) {

  client.context.data = {};

  var path = client.fields.source.substring(1).split('/'),
    dbName = path[0],
    database = application.databases[dbName],
    url = database.url,
    schema = url.substr(0, url.indexOf(':')),
    driver = db[dbName],
    filter = (client.fields.filter) ? JSON.parse(client.fields.filter) : {};
  /*
    source: dataSource,
    filter: filter,
    start: (fromPage * PAGESIZE),
    limit: (((toPage - fromPage) * PAGESIZE) + PAGESIZE),
    sortby: (sortcol) ? sortcol : '*',
    order: (sortdir > 0) ? "+asc" : "+desc")
  */
  if (path.length == 3) {
    if (schema == 'mysql') {
      var tableName = path[1]+'.'+path[2];
      database.connection.select(tableName, '*', filter, function(err, data, query) {
        if (!err) {
          var sql = query.sql.replace(path[1]+'.', ''); // replace(/`/g, '')
          if (!data) data = [];
          client.context.data = {
            start: 0,
            count: data.length,
            data: data,
            sql: sql
          };
        }
        callback();
      });
    } else if (schema == 'mongodb') {
      var dbClient = db.drivers.mongodb.MongoClient,
        url = 'mongodb://localhost:27017/'+path[1];
      dbClient.connect(url, function(err, connection) {
        connection.createCollection(path[2], function(err, collection) {
          collection.find(filter).toArray(function(err, nodes) {
            for (var i=0; i<nodes.length; ++i) {
              var node = nodes[i];
              for (field in node) if (typeof(node[field]) == 'object') node[field] = JSON.stringify(node[field]).replace(/"/g, '');
            }
            client.context.data = {
              start: 0,
              count: nodes.length,
              data: nodes
            };
            connection.close();
            callback();
          });
        });
      });
    } else callback();
  } else callback();

}