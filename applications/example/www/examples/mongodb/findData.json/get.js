(client, callback) => {
  dbAlias.category('testCategory', (err, category) => {
    if (err) return callback(err);
    category.findOne(client.query, (err, data) => {
      if (err) return callback(err);
      callback(data);
    });
  });
}
