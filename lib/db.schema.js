"use strict";

db.schema = {};
db.schema.definition = api.definition.require('db.schema.definition');

// Check relational database schema keywords validity
//
db.schema.validate = function(databaseSchema, consoleOutput) {
  var result = api.definition.validate(databaseSchema, db.schema.definition);
  if (consoleOutput && !result.valid) {
    console.log('Errors found:');
    var errorKey;
    for (errorKey in result.errors) console.log('  '+result.errors[errorKey].red);
  }
  return result;
};
