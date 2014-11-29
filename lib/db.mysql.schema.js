'use strict';

db.mysql.schema = {};

var crlf = '\r\n',
    cmnt = '-- ',
    line = cmnt + new Array(50).join('-') + crlf,
    altr = 'ALTER TABLE ';

var fieldTypes = {
  id:       { type: 'bigint', signed: false, nullable: false },
  tree:     { type: 'bigint', signed: false, nullable: true },
  uid:      { type: 'bigint', signed: false },
  guid:     { type: 'binary', size: 16, signed: false },
  ip:       { type: 'int', signed: false },
  hash:     { type: 'binary', size: 32 },
  int:      { type: 'int',    size: 10 },
  float:    { type: 'double' },
  str:      { type: 'varchar' },
  char:     { type: 'char' },
  date:     { type: 'date' },
  time:     { type: 'time' },
  datetime: { type: 'timestamp' },
  money:    { type: 'decimal', size: '10,2' },
  bool:     { type: 'bool' },
  text:     { type: 'text' }
  // add other native data types for mysql
};

// Generate relational database schema for MySQL
//
db.mysql.schema.generateScript = function(databaseSchema, consoleOutput) {
  var validationResult = db.schema.validate(databaseSchema, consoleOutput),
      sqlScript = '';
  if (consoleOutput) console.log('Schema validation: ' + (validationResult.valid ? 'OK'.green : 'Error'.red.bold));
  if (validationResult.valid) {
    sqlScript = line + cmnt + databaseSchema.caption + crlf + cmnt + 'Version: ' + databaseSchema.version + crlf + line + crlf;
    var table, tableName, primaryKey, primaryFieldDef, fieldIndex, indexes, indexName, compositeIndex,
        field, fieldDef, fieldType, fieldsDef, fieldNameMaxLength,
        references, reference, referenceKey, referenceStatement, fieldAttribute;
    for (tableName in databaseSchema) {
      if (tableName !== 'caption' && tableName !== 'version') {
        table = databaseSchema[tableName];
        fieldsDef = '';
        fieldNameMaxLength = 0;
        primaryKey = [];
        primaryFieldDef = '';
        fieldIndex = 1;
        indexes = [];
        references = [];
        sqlScript += 'CREATE TABLE ' + tableName + ' (' + crlf;
        var fieldName;
        for (fieldName in table.fields) {
          fieldNameMaxLength = Math.max(fieldNameMaxLength, fieldName.length);
        }
        for (fieldName in table.fields) {
          field = table.fields[fieldName];
          fieldDef = '';
          fieldType = fieldTypes[field.type];
          for (fieldAttribute in fieldType) {
            if (!(fieldAttribute in field)) field[fieldAttribute] = fieldType[fieldAttribute];
          }
          fieldDef = fieldType.type;
          if ('size' in field) fieldDef += '(' + field.size + ')';
          fieldDef += ' ';
          if (('signed' in field) && !field.signed) fieldDef += 'unsigned ';
          if ((('nullable' in field) && !field.nullable) || field.master) fieldDef += 'NOT NULL ';
          if (field.default) {
            if (field.type === 'datetime' && field.default === 'now') field.default = 'CURRENT_TIMESTAMP';
            else field.default = '"' + field.default + '"';
            fieldDef += 'DEFAULT ' + field.default + ' ';
          }
          if (field.comment) fieldDef += 'COMMENT "' + field.comment + '" ';
          if (fieldDef.length > 0) fieldDef = fieldDef.slice(0, -1);
          if (field.primary || (fieldIndex === 1 && inArray(['id', 'uid'], field.type))) primaryKey.push(fieldName);
          if (field.index) {
            if (field.index.unique) indexes.push('CREATE UNIQUE INDEX ak' + tableName + fieldName + ' ON ' + tableName + ' (' + fieldName + ');');
            else indexes.push('CREATE INDEX idx' + tableName + fieldName + ' ON ' + tableName + ' (' + fieldName + ');');
          }
          if (field.master || field.link || (field.lookup && field.lookup.dataset)) {
            reference = field.lookup ? field.lookup : (field.master ? field.master : field.link);
            referenceKey = ('key' in reference) ? reference.key : fieldName;
            referenceStatement = altr + tableName + ' ADD CONSTRAINT fk' + tableName + fieldName +
              ' FOREIGN KEY (' + fieldName + ') REFERENCES ' + reference.dataset + ' (' + referenceKey + ') ON DELETE ';
            if (!('deletion' in reference)) {
              if (field.master) reference.deletion = 'cascade';
              else if (('nullable' in field) && !field.nullable) reference.deletion = 'restrict';
            }
            if (reference.deletion) referenceStatement += reference.deletion.toUpperCase();
            else referenceStatement += 'SET NULL';
            references.push(referenceStatement + ';');
          }
          fieldsDef += '  ' + fieldName.rpad(' ', fieldNameMaxLength + 1) + ' ' + fieldDef + ',' + crlf;
          if (fieldIndex === 1) primaryFieldDef = fieldDef;
          fieldIndex++;
        }
        if (fieldsDef.length > 3) fieldsDef = fieldsDef.slice(0, -3) + crlf;
        sqlScript += fieldsDef + ');' + crlf + crlf;
        if (table.comment)           sqlScript += altr + tableName +' COMMENT = "' + table.comment + '";' + crlf + crlf;
        if (primaryKey.length > 0)   sqlScript += altr + tableName +' ADD CONSTRAINT pk' + tableName + ' PRIMARY KEY (' + primaryKey.join(', ') + ');' + crlf;
        if (primaryKey.length === 1) sqlScript += altr + tableName +' CHANGE ' + primaryKey[0] + ' ' + primaryKey[0] + ' ' + primaryFieldDef + ' auto_increment;' + crlf + crlf;
        if (indexes.length > 0)      sqlScript += indexes.join(crlf) + crlf + crlf;
        if (references.indexes) {
          for (indexName in references.indexes) {
            compositeIndex = references.indexes[indexName];
            sqlScript += 'CREATE ' + (compositeIndex.unique ? 'UNIQUE ' : '') + 'INDEX ' + (compositeIndex.unique ? 'ak' : 'idx') + indexName +
              ' ON ' + tableName + ' (' + compositeIndex.fields.join(', ') + ');' + crlf;
          }
          sqlScript += crlf;
        }
        if (references.length > 0) sqlScript += references.join(crlf) + crlf + crlf;
      }
    }
  } else if (consoleOutput) {
    console.log('Errors:');
    var errorKey;
    for (errorKey in validationResult.errors) console.log('  ' + validationResult.errors[errorKey].red.bold);

  }
  return {
    success:    !!sqlScript,
    script:     sqlScript,
    validation: validationResult
  };
};

// Execute multiple statements script for MySQL
//
db.mysql.schema.executeScript = function(target, script, callback) {
  var connection = db.drivers.mysql.createConnection(target.url, { multipleStatements: true });
  connection.on('error', db.mysql.onError);
  db.mysql.upgrade(connection);
  connection.connect();
  connection.query(script, [], callback);
  // TODO: refactor this
};
