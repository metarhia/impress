(client, callback) => {
  dbAlias.Category('testCategory', (err, category) => {
    category.new({ name: 'Paul', gender: true }, (err, objectId) => {
      if (err) return callback({ error: err });
      callback({ objectId: objectId });
    });
  });
}
