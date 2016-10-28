(client, callback) => {
  dbAlias.Category('testCategory', (err, category) => {
    category.update(client.query, (err) => {
      if (err) return callback({ error: err });
      callback({});
    });
  });
}
