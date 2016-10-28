(client, callback) => {
  dbAlias.category('testCategory', (err, category) => {
    category.new(client.query, (err, objectId) => {
      if (err) return callback({ error: err });
      callback({ objectId: objectId });
    });
  });
}
