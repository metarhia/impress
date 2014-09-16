module.exports = function(client, callback) {

  aliasNameMy.query('select * from City', function(err, rows, fields) {
    callback({ rows:rows, fields:fields });
  });

}