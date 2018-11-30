(client, callback) => {
  gs.connection.select({
    category: 'test',
  }).fetch((err, result) => {
    if (err) {
      callback(err, { error: err.message, keys: Object.keys(gs) });
      return;
    }
    callback(null, { result });
  });
}
