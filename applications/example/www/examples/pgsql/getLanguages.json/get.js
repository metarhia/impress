(client, callback) => {
  var select = 'select * from SystemLanguage where LanguageId < $1';
  aliasNamePg.query(select, ['10'], function(err, result) {
    callback({ rows: result.rows, fields: result.fields });
  });
}