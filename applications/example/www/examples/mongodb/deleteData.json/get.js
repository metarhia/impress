(client, callback) => {
  dbAlias.category('testCategory', (err, category) => {
    category.deleteById(client.query.objectId, (err) => {
      if (err) return callback(err);
      callback({});
    });
  });
}
