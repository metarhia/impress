(client, callback) => {
  dbAlias.Category('testCategory', function(err, data) {
    if (err) return callback({ error: err });
    console.log(client.query.objectId);
    data.get(client.query.objectId, (err, objectId) => {
      if (err) return callback({ error: err });
      console.log(objectId);
      callback(objectId);
    });
  });
}
