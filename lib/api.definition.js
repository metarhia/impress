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

// Walk through both data tree and definition tree and call function for each data item
//   data       - 
//   definition - 
//   name       - 
//   path       - 
//   callback(parent, data, definition, name, path)
//     parent     - item parent
//     data       - certain item 
//     definition - data structures definition hash
//     name       - item name in parent
//     path       - path to current item
//     def        - parsed data definition
//   return hash
//     valid   - boolean is result valud
//     errors  - array or empty array
//
api.definition.walk = function(data, definition, name, callback) {
  var keys = definition ? Object.keys(definition) : [],
      name = name || keys[0],
      path = '';
  return walk(null, data, definition, name, path, callback);
};

// Internal walk
//
function walk(parent, data, definition, name, path, callback) {
  var tpl = definition[name],
      i, j, key, subKey, item, itemType, template, def, itemPath, def, subItem, subItemPath, other;

  if (typeof(tpl) === 'string') {
    def = api.definition.parse(tpl);
    for (key in data) {
      item = data[key];
      itemPath = path+'.'+key;
      walk(item, item, definition, def.name, itemPath, callback);
    }
  } else {
    var tplKeys = typeof(tpl) === 'object' ? Object.keys(tpl) : [],
        dataKeys = (typeof(data) === 'object' && data !== null) ? Object.keys(data) : [],
        other = false;
    arrayDelete(tplKeys, '_other');
    dataKeys.merge(tplKeys);
  
    for (i = 0; i < dataKeys.length; i++) {
      key = dataKeys[i];
  
      item = data ? data[key] : '';
      if (tpl) {
        template = tpl[key];
        if (!template) {
          template = tpl['_other'];
          other = true;
        }
      }
      itemPath = path+'.'+key;
      def = api.definition.parse(template);
  
      callback(data, item, template, key, itemPath, def);
  
      if (item) {
        if (def.type === 'struct' ) {
          walk(data, item, definition, def.name, itemPath, callback);
        } else if (def.type === 'collection' && typeof(item) === 'object' ) {
          if (other) {
            walk(data, item, definition, def.name, itemPath, callback);
          } else {
            for (subKey in item) {
              subItem = item[subKey];
              subItemPath = itemPath+'.'+subKey;
              walk(item, subItem, definition, def.name, subItemPath, callback);
            }
          }
        }
      }

    }
  }
}

api.definition.types = [
  'number', 'string', 'array', 'boolean',
  'file', 'size', 'duration',
  'set',        // (one,two,three)
  'struct',     // {structName}
  'collection', // {{collection}}
  '*',          // * is anything
  'unknown'     // all other types
];

var definitionRx = new RegExp('['+escapeRegExp('[]{}()')+']', 'g');

// Parse field definition from schema
//   tpl - field definition
//   result:
//     type - field type, see: api.definition.types
//     name - struct name or collection name
//     default - default value
//     optional - is field optional, boolean flag
//     variants - set variants
//
api.definition.parse = function(tpl) {
  tpl = tpl+'';
  if (!tpl) return { type: 'unknown' };
  if (typeof(tpl) === 'object') return { type: 'hash' };
  var def = { type:'', optional: tpl.contains('[') },
      name = tpl.replace(definitionRx, '');
  if (tpl.contains('{{')) def.type = 'collection';
  if (def.type !== 'collection' && tpl.contains('{')) def.type = 'struct';
  if (tpl.contains('(')) def.type = 'set';
  if (name.contains(':')) {
    var valType = name.split(':');
    def.default = valType[0];
    def.type = valType[1];
  } else if (!def.type) def.type = name;
  else if (def.type === 'set') def.variants = name.split(',');
  else def.name = name;
  return def;
};

// Walk through data structures, add default values, convert size and duration to numbers
//
api.definition.preprocess = function(data, definition, definitionName, path) {
  console.log('api.definition.preprocess');
}

// Check data definition validity
//   data
//   definition
//
api.definition.validate = function(data, definition, name) {
  var result = { valid: true, errors: [] };
  api.definition.walk(data, definition, name, function(parent, data, definition, name, path, def) {
    var dataType = typeof(data),
        itemValid, hashItem, hashKey;
    if (def) {
      if (def.optional && dataType === 'undefined') itemValid = true;
      else if (def.type === 'set')        itemValid = inArray(def.variants, data);
      else if (def.type === '*')          itemValid = true;
      else if (def.type === 'array')      itemValid = Array.isArray(data);
      else if (def.type === 'number')     itemValid = dataType === 'number';
      else if (def.type === 'string')     itemValid = dataType === 'string';
      else if (def.type === 'boolean')    itemValid = dataType === 'boolean';
      else if (def.type === 'file')       itemValid = dataType === 'string';
      else if (def.type === 'size')       itemValid = inArray([ 'string', 'number' ], dataType);
      else if (def.type === 'duration')   itemValid = inArray([ 'string', 'number' ], dataType);
      else if (def.type === 'struct')     itemValid = dataType === 'object';
      else if (def.type === 'collection') itemValid = inArray(['array', 'object'], typeof(parent));
      else itemValid = false;
      if (!itemValid) result.errors.push({ path: path, error: "Unexpected value" });
      result.valid = result.valid && itemValid;
    } else {
      result.valid = false;
      result.errors.push({ path: path, error: "Unexpected name" });
    }
  });
  return result;
};
