'use strict';

// Data definition API for Impress Application Server

api.definition.require = (
  // Require definition file
  fileName // load schema from fileName
) => {
  if (!fileName.includes('/')) {
    fileName = impress.moduleDir + '/schemas/' + fileName;
  }
  if (!fileName.includes('.js')) {
    fileName += '.js';
  }
  const configFile = api.fs.readFileSync(fileName);
  const definition = api.jstp.parse(configFile.toString());
  return definition;
};

api.definition.walk = (
  // Walk through both data tree and definition tree
  // and call function for each data item
  data, // data to be validated
  definition, // validation rules
  name, // string
  callback // function(parent, data, definition, name, path)
  //   parent - item parent
  //   data - certain item
  //   definition - data structures definition hash
  //   name - item name in parent
  //   path - path to current item
  //   def - parsed data definition
  // Return: { valid, errors }
  //   valid - boolean is result valud
  //   errors - array or empty array
) => {
  const keys = definition ? Object.keys(definition) : [];
  const path = '';
  name = name || keys[0];
  return api.definition.walkRecursive(
    null, data, definition, name, path, callback
  );
};

api.definition.walkRecursive = (
  parent,
  data,
  definition,
  name,
  path,
  cb
) => {
  const tpl = definition[name];
  let key, item, template, def, itemPath, other;

  if (typeof(tpl) === 'string') {
    def = api.definition.parse(tpl);
    for (key in data) {
      item = data[key];
      itemPath = path + '.' + key;
      api.definition.walkRecursive(
        item, item, definition, def.name, itemPath, cb
      );
    }
  } else {
    const tplKeys = typeof(tpl) === 'object' ? Object.keys(tpl) : [];
    const dataKeys = (
      (typeof(data) === 'object' && data !== null) ? Object.keys(data) : []
    );
    other = false;

    const index = tplKeys.indexOf('_other');
    if (index >= -1) tplKeys.splice(index, 1);
    // Possible optimization:
    // if (tplKeys.includes('_other')) tplKeys.splice(index, 1);

    api.common.merge(dataKeys, tplKeys);

    let i, len, subKey, subItem, subItemPath;
    for (i = 0, len = dataKeys.length; i < len; i++) {
      key = dataKeys[i];

      item = data ? data[key] : '';
      if (tpl) {
        template = tpl[key];
        if (!template) {
          template = tpl._other;
          other = true;
        }
      }
      itemPath = path + '.' + key;
      def = api.definition.parse(template);

      cb(data, item, template, key, itemPath, def);

      if (item) {
        if (def.type === 'struct') {
          api.definition.walkRecursive(
            data, item, definition, def.name, itemPath, cb
          );
        } else if (def.type === 'collection' && typeof(item) === 'object') {
          if (other) {
            api.definition.walkRecursive(
              data, item, definition, def.name, itemPath, cb
            );
          } else {
            for (subKey in item) {
              subItem = item[subKey];
              subItemPath = itemPath + '.' + subKey;
              api.definition.walkRecursive(
                item, subItem, definition, def.name, subItemPath, cb
              );
            }
          }
        }
      }
    }
  }
};

// JavaScript types

api.definition.types = [
  'number', 'string', 'array', 'boolean',
  'file', 'size', 'duration',
  'set',        // (one,two,three)
  'struct',     // {structName}
  'collection', // {{collection}}
  '*',          // * is anything
  'unknown'     // all other types
];

const definitionRx = new RegExp(
  '[' + api.common.escapeRegExp('[]{}()') + ']', 'g'
);

api.definition.parse = (
  // Parse field definition from schema
  tpl // field definition
  // Return: hash
  //   type - field type, see: api.definition.types
  //   name - struct name or collection name
  //   default - default value
  //   optional - is field optional, boolean flag
  //   variants - set variants
  //   comment - substring after '//'
) => {
  tpl += '';
  if (!tpl) return { type: 'unknown' };
  const commentPos = tpl.indexOf('//');
  if (commentPos > -1) {
    // let comment = tpl.substring().trim();
    tpl = tpl.substring(0, commentPos).trim();
  }
  if (typeof(tpl) === 'object') return { type: 'hash', str: tpl };
  const def = {
    type: '',
    optional: tpl.includes('[') || tpl.includes(':')
  };
  const name = tpl.replace(definitionRx, '');
  if (tpl.includes('{{')) def.type = 'collection';
  if (def.type !== 'collection' && tpl.includes('{')) {
    def.type = 'struct';
  }
  if (tpl.includes('(')) def.type = 'set';
  if (name.includes(':')) {
    const valType = name.split(':');
    def.default = valType[0];
    def.type = valType[1];
  } else if (!def.type) {
    def.type = name;
  } else if (def.type === 'set') {
    def.variants = name.split(',');
  } else {
    def.name = name;
  }
  def.str = tpl;
  return def;
};

api.definition.preprocess = (
  // Walk through data structures, add default values,
  // convert size and duration to numbers
  data,
  definition,
  definitionName,
  path // eslint-disable-line
) => (
  api.definition.walk(
    data, definition, definitionName, api.definition.preprocessValue
  )
);

api.definition.preprocessValue = (
  parent, // object/hash containing given data
  data, // value of given data
  definition, // metadata definition of whole data structure
  name, // name of given data within parent hash
  path, // dot-separated path to the given data
  def // metadata definition of given data
) => {
  if (def.type === 'size') {
    parent[name] = api.common.sizeToBytes(data);
  } else if (def.type === 'duration') {
    parent[name] = api.common.duration(data);
  } else if (def.type === 'number') {
    parent[name] = api.definition.parseNumber(data);
  } else if (def.type === 'boolean' && typeof(data) !== 'boolean') {
    parent[name] = data === 'true';
  }
};

api.definition.parseNumber = (
  s // string containing integer or float number
  // Return: number or undefined
) => {
  const n = parseFloat(s);
  if (isNaN(n)) return;
  else return n;
};

api.definition.validate = (
  data, // data to validate
  definition, // definition hash
  name, // definition name in definition hash
  preprocess // flag for data preprocessing (default false)
) => {
  const result = { valid: true, errors: [] };
  api.definition.walk(data, definition, name, walker);
  return result;

  function walker(parent, data, definition, name, path, def) {
    let dataType = typeof(data),
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
      const types = {
        'number': ['number'],
        'string': ['string'],
        'boolean': ['boolean'],
        'file': ['string'],
        'size': ['string', 'number'],
        'duration': ['string', 'number'],
        'struct': ['object'],
        'hash': ['object']
      };
      if (def.type === '*' || def.optional && dataType === 'undefined') {
        itemValid = true;
      } else if (def.type === 'set') {
        itemValid = def.variants.includes(data);
      } else if (def.type === 'array') {
        itemValid = Array.isArray(data);
      } else if (def.type === 'collection') {
        itemValid = ['array', 'object'].includes(typeof(parent));
      } else {
        itemValid = types[def.type].includes(dataType);
      }
      if (!itemValid) result.errors.push({
        path,
        error: 'Unexpected value "' + data + '" for definition: ' + def.str
      });
      result.valid = result.valid && itemValid;
    } else {
      result.valid = false;
      result.errors.push({
        path,
        error: 'Unexpected name "' + name + '"'
      });
    }
  }
};

api.definition.printErrors = (
  message, // error message
  validationResult // result returned from api.definition.validate
) => {
  if (validationResult.valid) return;
  console.log(message);
  let i, len, error;
  for (i = 0, len = validationResult.errors.length; i < len; i++) {
    error = validationResult.errors[i];
    console.log('  ' + error.path.bold + ' - ' + error.error.red.bold);
  }
};
