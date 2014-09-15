module.exports = function(client, callback) {

  aliasNamePg.query('select * from SystemLanguage where LanguageId<$1', ['10'], function(err, result) {
    callback({ rows:result.rows, fields:result.fields });
  });

}