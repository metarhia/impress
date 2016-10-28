(client, callback) => {
  dbAlias.category('testCategory', function(err, data) {
    if (err) return callback({ error: err });
    data.get(client.query.objectId, (err, objectId) => {
      if (err) return callback({ error: err });
      callback(objectId);
    });
  });
}
