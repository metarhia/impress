(client, callback) => {
  dbAlias.connection.collections((err, collections) => {
    let items = [];
    for (let i = 0; i < collections.length; i++) {
      items.push(collections[i].collectionName);
    }
    callback(items);
  });
}
