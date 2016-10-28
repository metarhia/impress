(client, callback) => {
  dbAlias.Category('testCategory', (err, category) => {
    category.delete(client.query.objectId, (err) => {
      if (err) return callback(err);
      callback({});
    });
  });
}
