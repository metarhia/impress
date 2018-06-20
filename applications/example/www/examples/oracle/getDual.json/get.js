(client, callback) => {
  oracle.connection.execute(`select * from dual`, (err, result) => {
    if (err) {
      callback({ error: err.message });
      return;
    }
    callback({ rows: result.rows, fields: result.metaData });
  });
}
