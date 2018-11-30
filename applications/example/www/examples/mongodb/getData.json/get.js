(client, callback) => dbAlias.testCollection
  .find({})
  .toArray(callback);
