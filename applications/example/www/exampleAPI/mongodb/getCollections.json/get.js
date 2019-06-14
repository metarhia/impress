(client, callback) => {

  dbAlias.collections((err, collections) => {
    const items = [];
    for (let i = 0; i < collections.length; i++) {
      items.push(collections[i].collectionName);
    }
    callback(err, items);
  });

}
