"use strict";

db.definition = {};

// Check relational database schema keywords validity
//
db.definition.validate = function(data, definition, definitionName, path) {
  if (!definitionName) definitionName = 'schema';
  var tpl = definition[definitionName],
      errors = [];
  if (!path) path = '';
  var isValid = true,
      item, itemTemplate, itemType, isItemValid, itemPath, hashItem;
  for (var key in data) {
    item = data[key];
    itemTemplate = tpl[key];
    itemType = typeof(item);
    isItemValid = false;
    itemPath = path+'.'+key;
    if (!itemTemplate) itemTemplate = tpl['_other'];
    if (itemTemplate) {
      if (Array.isArray(itemTemplate)) isItemValid = inArray(itemTemplate, item);
      else if (typeof(itemTemplate) === 'string') {
        if (itemTemplate === 'array') isItemValid = Array.isArray(item);
        else {
          itemTemplate = itemTemplate.replace(/}/g, '').split('{');
          if (itemTemplate.length === 1) isItemValid = (itemType === itemTemplate[0]);
          else if (itemTemplate.length === 2) isItemValid = db.schema.validate(item, consoleOutput, itemTemplate[1], itemPath);
          else if (itemTemplate.length === 3) {
            for (var hashKey in item) {
              hashItem = item[hashKey];
              itemPath = path+'.'+key+'.'+hashKey;
              isItemValid = db.schema.validate(hashItem, consoleOutput, itemTemplate[2], itemPath);
              if (!isItemValid) {
                errors.push(itemPath);
                if (consoleOutput) console.log('Error in '+itemPath.red);
              }
              isValid = isValid && isItemValid;
            }
            itemPath = null;
          }
        }
      }
    }
    if (itemPath) {
      if (!isItemValid) {
        errors.push(itemPath);
        if (consoleOutput) console.log('Error in '+itemPath.red);
      }
      isValid = isValid && isItemValid;
    }
  }
  return {
    valid: isValid,
    errors: errors
  };
};
