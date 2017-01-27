(client, callback) => {
  aliasNameMy.query('select * from City', (err, rows, fields) => {
    callback({ rows, fields });
  });
}
