(client, callback) => {
  dbAlias.Category('testCategory', (err, category) => {
    category.new(client.query, (err, objectId) => {
      if (err) return callback({ error: err });
      callback({ objectId: objectId });
    });
  });
}
