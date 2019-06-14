(client, callback) => {

  oracle.query('select * from dual', (err, result) => {
    if (err) {
      callback(err, { error: err.message });
      return;
    }
    callback(null, { rows: result.rows, fields: result.metaData });
  });

}
