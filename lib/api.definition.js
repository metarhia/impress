'use strict';

// Data definition API
//
api.definition = {};

// Require definition file
//
api.definition.require = function(fileName) {
  if (!fileName.contains('/')) fileName = '../schemas/' + fileName;
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
      path = '';
  name = name || keys[0];
  return api.definition.walkRecursive(null, data, definition, name, path, callback);
};

// Internal walk
//
api.definition.walkRecursive = function(parent, data, definition, name, path, callback) {
  var tpl = definition[name],
      i, key, subKey, item, template, def, itemPath, subItem, subItemPath, other;

  if (typeof(tpl) === 'string') {
    def = api.definition.parse(tpl);
    for (key in data) {
      item = data[key];
      itemPath = path + '.' + key;
      api.definition.walkRecursive(item, item, definition, def.name, itemPath, callback);
    }
  } else {
    var tplKeys = typeof(tpl) === 'object' ? Object.keys(tpl) : [],
        dataKeys = (typeof(data) === 'object' && data !== null) ? Object.keys(data) : [];
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
      itemPath = path + '.' + key;
      def = api.definition.parse(template);
  
      callback(data, item, template, key, itemPath, def);
  
      if (item) {
        if (def.type === 'struct' ) {
          api.definition.walkRecursive(data, item, definition, def.name, itemPath, callback);
        } else if (def.type === 'collection' && typeof(item) === 'object' ) {
          if (other) {
            api.definition.walkRecursive(data, item, definition, def.name, itemPath, callback);
          } else {
            for (subKey in item) {
              subItem = item[subKey];
              subItemPath = itemPath + '.' + subKey;
              api.definition.walkRecursive(item, subItem, definition, def.name, subItemPath, callback);
            }
          }
        }
      }

    }
  }
};

api.definition.types = [
  'number', 'string', 'array', 'boolean',
  'file', 'size', 'duration',
  'set',        // (one,two,three)
  'struct',     // {structName}
  'collection', // {{collection}}
  '*',          // * is anything
  'unknown'     // all other types
];

var definitionRx = new RegExp('[' + escapeRegExp('[]{}()') + ']', 'g');

// Parse field definition from schema
//   tpl - field definition
//   result:
//     type - field type, see: api.definition.types
//     name - struct name or collection name
//     default - default value
//     optional - is field optional, boolean flag
//     variants - set variants
//     comment - substring after '//'
//
api.definition.parse = function(tpl) {
  tpl = tpl + '';
  if (!tpl) return { type: 'unknown' };
  var commentPos = tpl.indexOf('//'),
      comment = '';
  if (commentPos !== -1) {
    comment = tpl.substring().trim();
    tpl = tpl.substring(0, commentPos).trim();
  }
  if (typeof(tpl) === 'object') return { type: 'hash', str: tpl };
  var def = { type:'', optional: tpl.contains('[') || tpl.contains(':') },
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
  def.str = tpl;
  return def;
};

// Walk through data structures, add default values, convert size and duration to numbers
//
api.definition.preprocess = function(data, definition, definitionName, path) {
  api.definition.walk(data, definition, name, api.definition.preprocessValue);
  return result;
};

// Preprocess single value
//
api.definition.preprocessValue = function(parent, data, definition, name, path, def) {
  if (def.type === 'size') parent[name] = sizeToBytes(data);
  else if (def.type === 'duration') parent[name] = duration(data);
  else if (def.type === 'number')   parent[name] = api.definition.parseNumber(data);
  else if (def.type === 'boolean' && typeof(data) !== 'boolean') parent[name] = data === 'true';
};

api.definition.parseNumber = function(s) {
  var n = parseFloat(s);
  if (isNaN(n)) return;
  else return n;
};

// Check data definition validity
//   data - data to validate
//   definition - definition hash
//   name - definition name in definition hash
//   preprocess - flag for data preprocessing (default false)
//
api.definition.validate = function(data, definition, name, preprocess) {
  var result = { valid: true, errors: [] };
  api.definition.walk(data, definition, name, function(parent, data, definition, name, path, def) {
    var dataType = typeof(data),
        itemValid;
    if (dataType === 'undefined') {
      parent[name] = def.default;
      data = def.default;
      dataType = typeof(data);
    }
    if (preprocess) {
      api.definition.preprocessValue(parent, data, definition, name, path, def);
      data = parent[name];
      dataType = typeof(data);
    }
    if (def.type !== 'undefined') {
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
      if (!itemValid) result.errors.push({
        path: path,
        error: 'Unexpected value "' + data + '" for definition: ' + def.str
      });
      result.valid = result.valid && itemValid;
    } else {
      result.valid = false;
      result.errors.push({ path: path, error: 'Unexpected name "' + name + '"' });
    }
  });
  return result;
};

// Print errors if not valid
//   validationResult - result returned from api.definition.validate
//
api.definition.printErrors = function(message, validationResult) {
  if (!validationResult.valid) {
    console.log(message);
    var j, error;
    for (j = 0; j < validationResult.errors.length; j++) {
      error = validationResult.errors[j];
      console.log('  ' + error.path.bold + ' - ' + error.error.red.bold);
    }
  }
};
