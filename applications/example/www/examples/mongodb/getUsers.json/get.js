(client, callback) => {
  dbAlias.users
    .find({ password: '123' })
    .toArray((err, nodes) => {
      callback(err, nodes);
    });
}
