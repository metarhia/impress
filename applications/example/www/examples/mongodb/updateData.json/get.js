(client, callback) => {
  dbAlias.category('testCategory', (err, category) => {
    category.updateById(client.query, (err) => {
      if (err) return callback({ error: err });
      callback({});
    });
  });
}
