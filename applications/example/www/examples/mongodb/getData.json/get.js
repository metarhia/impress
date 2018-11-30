(client, callback) => {
  dbAlias.testCollection
    .find({})
    .toArray((err, nodes) => {
      callback(err, nodes);
    });
}
