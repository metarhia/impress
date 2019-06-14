(client, callback) => dbAlias.users
  .find({ password: '123' })
  .toArray(callback);
