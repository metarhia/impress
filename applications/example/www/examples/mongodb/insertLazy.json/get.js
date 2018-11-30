(client, callback) => {
  dbAlias.testCollection.insert(client.query, (err) => {
    callback(err, !err);
  });
}
