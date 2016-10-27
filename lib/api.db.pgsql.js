'use strict';

// PgSQL database plugin for Impress Application Server
//
if (api.pgsql) {

  api.db.pgsql = {};
  api.db.drivers.pgsql = api.pgsql;

  // Open pgsql database
  //
  // Example:
  //
  // open({
  //   name: 'databaseName',
  //   url: 'postgres://username:password@host/database',
  //   tables: ['table1', 'table2', ...]
  // }, callback);
  //
  // callback after connection established
  //
  api.db.pgsql.open = function(database, callback) {

    database.retryCounter++;
    var application = database.application,
        connection = new api.pgsql.Client(database.url);
    connection.slowTime = database.slowTime;

    // api.db.pgsql.upgrade(connection);

    connection.connect(function(err) {
      if (err) {
        application.log.error(api.json.stringify(err));
        api.timers.setTimeout(function() {
          if (database.retryCounter <= database.retryCount) {
            api.db.pgsql.open(database, callback);
          }
        }, database.retryInterval);
      }
      database.retryCounter = 0;
    });

    connection.on('query', function(err, res, query) {
      if (err) {
        application.log.error(
          'PgSQL Error[' + err.code + ']: ' + err.toString() + '\t' + query.text
        );
      }
      application.log.debug(query.text);
    });

    connection.on('slow', function(err, res, query, executionTime) {
      application.log.slow(executionTime + 'ms\t' + query.text);
    });

    connection.on('error', function(err) {
      application.log.error(api.json.stringify(err));
    });

    database.connection = connection;
    api.db.pgsql.mixinDatabase(database);
    if(typeof callback == 'function') callback();
  };

  // Upgrade connection to comply Impress db library interface
  //
  api.db.pgsql.upgrade = function(connection) {

    connection.slowTime = 2000;

    api.common.override(connection, function query(sql, values, callback) {
      var startTime = Date.now();
      if (typeof(values) === 'function') {
        callback = values;
        values = [];
      }
      var aQuery = query.inherited(sql, values, function(err, res) {
        var endTime = Date.now(),
            executionTime = endTime - startTime;
        connection.emit('query', err, res, aQuery);
        if (connection.slowTime && (executionTime >= connection.slowTime)) {
          connection.emit('slow', err, res, aQuery, executionTime);
        }
        if (callback) callback(err, res);
      });
      return aQuery;
    });

  };

  api.db.pgsql.mixinDatabase = function(database) {
    database.generateSchema = function(databaseSchema, callback) {
      var validationResult = api.db.schema.validate(databaseSchema);
      var sqlScript = '';
      console.log('Schema validation: ' + (validationResult.valid ? 'OK'.green : 'Error'.red.bold));
      if (validationResult.valid) {
        const data = api.db.pgsql.schema.generateScript(databaseSchema);
        api.db.pgsql.schema.executeScript(database, data.script, callback);
      } else {
        callback();
      }
    };
  };

  var crlf = '\r\n',
      cmnt = '-- ',
      line = cmnt + new Array(50).join('-') + crlf,
      altr = 'ALTER TABLE ';

  var fieldTypes = {
    id:       { type: 'serial', nullable: false },
    tree:     { type: 'bigint', nullable: true },
    uid:      { type: 'bigint' },
    guid:     { type: 'binary', size: 16 },
    ip:       { type: 'int' },
    hash:     { type: 'binary', size: 32 },
    int:      { type: 'int', size: 10 },
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

  // PgSQL schema utilities stub
  //
  api.db.pgsql.schema = {};


  // Execute multiple statements script for PgSQL
  //
  api.db.pgsql.schema.executeScript = function(target, script, callback) {
    target.connection.query(script, callback);
  };

  // Generate relational database schema for PgSQL
  //
  api.db.pgsql.schema.generateScript = function(databaseSchema, consoleOutput) {
    var validationResult = api.db.schema.validate(databaseSchema, consoleOutput);
    var sqlScript = '';

    if (consoleOutput) console.log('Schema validation: ' + (validationResult.valid ? 'OK'.green : 'Error'.red.bold));

    if (validationResult.valid) {
      sqlScript = line + cmnt + databaseSchema.caption + crlf + cmnt + 'Version: ' + databaseSchema.version + crlf + line + crlf;

      var relations = '';
      var table, tableName, primaryKey, primaryFieldDef, fieldIndex, indexes,
          indexName, compositeIndex, field, fieldDef, fieldType, fieldsDef,
          fieldNameMaxLength, fieldName, references, reference, referenceKey,
          referenceStatement, fieldAttribute;

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
            if (('size' in field) && field.size !== undefined) fieldDef += '(' + field.size + ')';
            fieldDef += ' ';
            if ((('nullable' in field) && !field.nullable) || field.master) fieldDef += 'NOT NULL ';
            if (field.default) {
              if (field.type === 'datetime' && field.default === 'now') field.default = 'now()';
              else field.default = '"' + field.default + '"';
              fieldDef += 'DEFAULT ' + field.default + ' ';
            }
            if (field.comment) fieldDef += 'COMMENT "' + field.comment + '" ';
            if (fieldDef.length > 0) fieldDef = fieldDef.slice(0, -1);
            if (field.primary || (fieldIndex === 1 && api.common.inArray(['id', 'uid'], field.type))) primaryKey.push(fieldName);
            if (field.index) indexes.push('CREATE ' + (indexes.unique ? 'UNIQUE INDEX ak' : 'INDEX idx') + tableName + fieldName + ' ON ' + tableName + ' (' + fieldName + ');')

            if (field.master || field.link || (field.lookup && field.lookup.dataset)) {
              reference = field.lookup ? field.lookup : (field.master ? field.master : field.link);
              referenceKey = ('key' in reference) ? reference.key : fieldName;
              referenceStatement = altr + tableName + ' ADD CONSTRAINT fk' + tableName + fieldName + ' FOREIGN KEY (' + fieldName + ') REFERENCES ' + reference.dataset + ' (' + referenceKey + ') ON DELETE ';
              if (!('deletion' in reference)) {
                if (field.master) reference.deletion = 'cascade';
                else if (('nullable' in field) && !field.nullable) reference.deletion = 'restrict';
              }
              if (reference.deletion) referenceStatement += reference.deletion.toUpperCase();
              else referenceStatement += 'SET NULL';
              references.push(referenceStatement + ';');
            }

            fieldsDef += '  ' + api.common.rpad('"' + fieldName + '"', ' ', fieldNameMaxLength + 1) + ' ' + fieldDef + ',' + crlf;
            if (fieldIndex === 1) primaryFieldDef = fieldDef;
            fieldIndex++;
          }
          if (fieldsDef.length > 3) fieldsDef = fieldsDef.slice(0, -3) + crlf;
          sqlScript += fieldsDef + ');' + crlf + crlf;
          if (table.comment)           sqlScript += altr + tableName +' COMMENT = "' + table.comment + '";' + crlf + crlf;
          if (primaryKey.length > 0)   sqlScript += altr + tableName +' ADD CONSTRAINT pk' + tableName + ' PRIMARY KEY (' + primaryKey.join(', ') + ');' + crlf;
          if (indexes.length > 0)      sqlScript += indexes.join(crlf) + crlf + crlf;
          if (references.indexes) {
            for (indexName in references.indexes) {
              compositeIndex = references.indexes[indexName];
              sqlScript += 'CREATE ' + (compositeIndex.unique ? 'UNIQUE ' : '') + 'INDEX ' + (compositeIndex.unique ? 'ak' : 'idx') + indexName +
                ' ON ' + tableName + ' (' + compositeIndex.fields.join(', ') + ');' + crlf;
            }
            sqlScript += crlf;
          }
          if (references.length > 0) relations += references.join(crlf) + crlf + crlf;
        }
      }

      if(relations) sqlScript += crlf + crlf + crlf + relations;
    } else if (consoleOutput) {
      console.log('Errors:');
      var errorKey;
      for (errorKey in validationResult.errors) console.log('  ' + validationResult.errors[errorKey].red.bold);
    }
    return {
      success: !!sqlScript,
      script: sqlScript,
      validation: validationResult
    };
  };

}
