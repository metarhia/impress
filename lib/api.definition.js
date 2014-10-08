"use strict";

// Data definition API
//
api.definition = {};

// Require definition file
//
api.definition.require = function(fileName) {
  if (!fileName.contains('/')) fileName = '../schemas/'+fileName;
  var definition = null;
  try { definition = require(fileName); } catch(err) {}
  return definition;
};

// Check data definition validity
//
api.definition.validate = function(data, definition, definitionName, path) {
  if (!definitionName) definitionName = Object.keys(definition)[0];
  var tpl = definition[definitionName],
      errors = [], isValid = true;
  if (!path) path = '';
  var key, item, itemTemplate, itemType, isItemValid, itemPath, hashItem, hashKey;
  for (key in data) {
    item = data[key];
    itemTemplate = tpl[key];
    itemType = typeof(item);
    isItemValid = false;
    itemPath = path+'.'+key;
    if (!itemTemplate) itemTemplate = tpl['_other'];
    if (itemTemplate) {
      if (Array.isArray(itemTemplate)) isItemValid = inArray(itemTemplate, item);
      else if (typeof(itemTemplate) === 'string') {
        if (itemTemplate === 'any') isItemValid = true;
        else if (itemTemplate === 'array') isItemValid = Array.isArray(item);
        else {
          itemTemplate = itemTemplate.replace(/}/g, '').split('{');
          if (itemTemplate.length === 1) isItemValid = (itemType === itemTemplate[0]);
          else if (itemTemplate.length === 2) isItemValid = api.definition.validate(item, definition, itemTemplate[1], itemPath);
          else if (itemTemplate.length === 3) {
            for (hashKey in item) {
              hashItem = item[hashKey];
              itemPath = path+'.'+key+'.'+hashKey;
              isItemValid = api.definition.validate(hashItem, definition, itemTemplate[2], itemPath);
              if (!isItemValid) errors.push(itemPath);
              isValid = isValid && isItemValid;
            }
            itemPath = null;
          }
        }
      }
    }
    if (itemPath) {
      if (!isItemValid) errors.push(itemPath);
      isValid = isValid && isItemValid;
    }
  }
  return {
    valid:  isValid,
    errors: errors
  };
};
