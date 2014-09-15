module.exports = function(client, callback) {

  dbAlias.connection.collections(function(err, collections) {
    var items = [];
    for (var i = 0; i < collections.length; i++) {
      items.push(collections[i].collectionName);
    }
    callback(items);
  });

}