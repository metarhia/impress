(client, callback) => {
  dbAlias.users
    .find({ password: '123' })
    .toArray(function(err, nodes) {
      callback(nodes);
    });
}
