(client, callback) => {
  gs.select('test', { Name: 'test' })
    .fetch((err, result) => {
      if (err) {
        callback(err, { error: err.message });
        return;
      }
      callback(null, { result });
    });
}
