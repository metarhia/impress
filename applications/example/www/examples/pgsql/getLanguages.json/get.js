(client, callback) => {
  const select = 'select * from SystemLanguage where LanguageId < $1';
  aliasNamePg.query(select, ['10'], (err, result) => {
    callback({ rows: result.rows, fields: result.fields });
  });
}
