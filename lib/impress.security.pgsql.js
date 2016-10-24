'use strict';

// PostgreSQL security provider for Impress Application Server
//
impress.security.pgsql = {};

// Mixin security to application instance
//
impress.security.pgsql.mixin = function(application) {
  application.security.hasDbWarned = false;

  // Is application has security DB configured
  //
  application.security.hasDb = function() {
    var result = api.common.getByPath(application, 'databases.security.sessions');
    if (!result && !application.security.hasDbWarned) {
      application.log.warning('No security database configured or can not connect to db');
      application.security.hasDbWarned = true;
    }
    return result;
  };

  // Create collections and indexes for security subsystem in PostgreSQL
  //
  application.security.createDataStructures = function(callback) {
    console.log('Impress'.green.bold + ' installing initial data structures to PostgreSQL...'.green);
    if (!api.db.pgsql) application.log.warning('No PostgreSQL drivers found');
    else {
      var securitySchema = api.definition.require('impress.security.schema');
      if (!securitySchema) {
        application.log.warning('No Impress security database schema for PostgreSQL loaded');
        if (callback) callback();
      } else {
        application.databases.security.generateSchema(securitySchema, function() {
          console.log('  Data changed. Bye!'.green);
          if (callback) callback();
        });
      }
    }
  };

  application.security.dropDataStructures = function(callback) {
    // Not implemented
    if (callback) callback();
  };

  application.security.emptyDataStructures = function(callback) {
    // Not implemented
    if (callback) callback();
  };
};
