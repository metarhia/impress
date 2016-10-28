(client, callback) => {
  dbAlias.Category('smthng', function(err, data) {
    console.log(err, data);
    if (err) return callback({ error: err });
    data.new({ name: 'Vladka', nagibator: 228 }, (err, objectId) => {
      if (err) return callback({ error: err });
      callback(objectId);
    });
//    var obj = data.get("580f524de5cf05d96d0db30e", (err, data) => {
//      if (err) return callback({ error: err });
//      callback(data); 
//    });
  });
//  dbAlias.connection.collections(function(err, collections) {
//    var items = [];
//    for (var i = 0; i < collections.length; i++) {
//      items.push(collections[i].collectionName);
//    }
//    callback(items);
//  });
}
