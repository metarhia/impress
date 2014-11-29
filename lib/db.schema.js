'use strict';

db.schema = {};
db.schema.definition = api.definition.require('db.schema.definition');

// Check relational database schema keywords validity
//
db.schema.validate = function(databaseSchema, consoleOutput) {
  var result = api.definition.validate(databaseSchema, db.schema.definition, 'schema');
  if (consoleOutput) api.definition.printErrors('Error(s) in schema found:'.red.bold, result);
  return result;
};
