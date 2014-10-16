"use strict";

db.schema = {};
db.schema.definition = api.definition.require('db.schema.definition');

// Check relational database schema keywords validity
//
db.schema.validate = function(databaseSchema, consoleOutput) {

  //console.dir({databaseSchema:databaseSchema, definition:db.schema.definition});

  var result = api.definition.validate(databaseSchema, db.schema.definition, 'schema');
  if (consoleOutput && !result.valid) {
    console.log('Errors found:');
    var j, error;
    for (j = 0; j < result.errors.length; j++) {
      error = result.errors[j];
      console.log('  '+error.path.yellow+' - '+error.error.red.bold);
    }
  }

  return result;
};
