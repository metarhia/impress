'use strict';

// Global Storage API

// Metamodel
//
api.gs.metamodel = {};
api.gs.metamodel.cache = {};
 
// Get Metamodel
//   modelName - globally unique metamodel name
//   callback - function(err, metamodel)
//
api.gs.metamodel.get = function(metamodelName, callback) {

};

// Get object from Global Storage
//   objectId - globally unique object id
//   callback - function(err, object)
//
api.gs.get = function(objectId, callback) {

};

// Create object in Global Storage
//   object - object to be stored
//   callback - function(err, objectId)
//
api.gs.new = function(object, callback) {

};

// Update object in Global Storage
//   object - object to be updated
//   object.id - globally unique object id
//   callback - function(err)
//
api.gs.update = function(object, callback) {

};

// Delete object in Global Storage
//   objectId - globally unique object id
//   callback - function(err)
//
api.gs.delete = function(objectId, callback) {

};

// Find objects in Global Storage
//   conditions - globally unique object id
//   aggregation - how to aggregate result data
//   callback - function(err, data)
//
api.gs.find = function(conditions, aggregations, callback) {

};

/* Some conceptual examples

cities.get({ name: 'Kiev' }, function(kiev) {
  var cityMetadata = api.gs.getMetadata('City');
  var screenDef1 = api.guiConsole.extractUI(cityMetadata);
  var form1 = api.guiConsole.createScreen(screenDef1);
  form1.on('focus', callback);
  form1.on('save', function() {
    cities.update(form1.collectObject());
  });
  form1.show();
});

//

collection.get(query, function(obj) {
  var metadata = api.gs.getMetadata(obj.className);
  var screenDef = api.guiConsole.extractUI(metadata);
  var form = api.guiConsole.createScreen(screenDef);
  form.on('save', function() {
    collection.update(form.collectObject());
  });
  form.show();
});

*/

// Convert data into object using metadata
//   data - array to be mapped to given metadata by key position
//   schema - metadata definition
//   return - JavaScript object
//
api.gs.dataToObject = function(data, schema) {

};

// Convert object into data using metadata
//   obj - JavaScript object to be mapped to array by key position
//   schema - metadata definition
//   return - JavaScript object
//
api.gs.objectToData = function(obj, schema) {

};

// Mixin metada methods and metadata to data
//   data - data array
//   metadata - metadata object
//   return - fake object with get/set
//
api.gs.projection = function(data, metadata) {
  var obj = {},
      keys = Object.keys(metadata);
  keys.forEach(function(fieldName, index) {
    Object.defineProperty(obj, fieldName, {
      enumerable: true,
      get: function () {
        return data[index];
      },
      set: function(value) {
        data[index] = value;
      }
    });
  });
  return obj;
};
