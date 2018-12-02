'use strict';

// Data definition API for Impress Application Server

// Require definition file
//   fileName <string> load schema from fileName
api.definition.require = fileName => {
  if (!fileName.includes('/')) {
    fileName = api.path.join(impress.moduleDir, 'schemas', fileName);
  }
  if (!fileName.includes('.js')) {
    fileName += '.js';
  }
  const configFile = api.fs.readFileSync(fileName);
  const definition = api.mdsf.parse(configFile.toString());
  return definition;
};

// Walk through both data tree and definition tree
api.definition.walk = (data, definition, name, callback) => {
  const keys = definition ? Object.keys(definition) : [];
  const path = '';
  name = name || keys[0];
  api.definition.walkRecursive(
    null, data, definition, name, path, callback
  );
};

api.definition.walkRecursive = (parent, data, definition, name, path, cb) => {
  const tpl = definition[name];

  if (typeof tpl === 'string') {
    const def = api.definition.parse(tpl);
    for (const key in data) {
      const item = data[key];
      const itemPath = path + '.' + key;
      api.definition.walkRecursive(
        item, item, definition, def.name, itemPath, cb
      );
    }
  } else {
    const tplKeys = typeof tpl === 'object' ? Object.keys(tpl) : [];
    let dataKeys = typeof data === 'object' && data !== null ?
      Object.keys(data) : [];
    let other = false;

    const index = tplKeys.indexOf('_other');
    if (index >= -1) tplKeys.splice(index, 1);
    // Possible optimization:
    // if (tplKeys.includes('_other')) tplKeys.splice(index, 1);

    dataKeys = api.common.merge(dataKeys, tplKeys);

    for (let i = 0; i < dataKeys.length; i++) {
      let template;
      const key = dataKeys[i];
      const item = data ? data[key] : '';
      if (tpl) {
        template = tpl[key];
        if (!template) {
          template = tpl._other;
          other = true;
        }
      }
      const itemPath = path + '.' + key;
      const def = api.definition.parse(template);

      cb(data, item, template, key, itemPath, def);

      if (!item) continue;
      if (def.type === 'struct') {
        api.definition.walkRecursive(
          data, item, definition, def.name, itemPath, cb
        );
      } else if (def.type === 'collection' && typeof item === 'object') {
        if (other) {
          api.definition.walkRecursive(
            data, item, definition, def.name, itemPath, cb
          );
        } else {
          for (const subKey in item) {
            const subItem = item[subKey];
            const subItemPath = itemPath + '.' + subKey;
            api.definition.walkRecursive(
              item, subItem, definition, def.name, subItemPath, cb
            );
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

api.definition.parse = tpl => {
  tpl += '';
  if (!tpl) return { type: 'unknown' };
  const commentPos = tpl.indexOf('//');
  if (commentPos > -1) {
    tpl = tpl.substring(0, commentPos).trim();
  }
  if (typeof tpl === 'object') return { type: 'hash', str: tpl };
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

// Walk through data structures, add default values,
// convert size and duration to numbers
api.definition.preprocess = (data, definition, definitionName) => {
  api.definition.walk(
    data, definition, definitionName, api.definition.preprocessValue
  );
};

api.definition.preprocessValue = (parent, data, dfn, name, path, def) => {
  if (def.type === 'size') {
    parent[name] = api.common.sizeToBytes(data);
  } else if (def.type === 'duration') {
    parent[name] = api.common.duration(data);
  } else if (def.type === 'number') {
    parent[name] = api.definition.parseNumber(data);
  } else if (def.type === 'boolean' && typeof data !== 'boolean') {
    parent[name] = data === 'true';
  }
};

api.definition.parseNumber = s => {
  const n = parseFloat(s);
  if (isNaN(n)) return;
  else return n;
};

api.definition.validate = (data, definition, name, preprocess) => {
  const result = { valid: true, errors: [] };
  const walker = (parent, data, definition, name, path, def) => {
    let dataType = typeof data;
    let itemValid, error;
    if (dataType === 'undefined') {
      parent[name] = def.default;
      data = def.default;
      dataType = typeof data;
    }
    if (preprocess) {
      api.definition.preprocessValue(parent, data, definition, name, path, def);
      data = parent[name];
      dataType = typeof data;
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
        itemValid = ['array', 'object'].includes(typeof parent);
      } else {
        itemValid = types[def.type].includes(dataType);
      }
      error = `Unexpected value "${data}" for definition: ${def.str}`;
      if (!itemValid) result.errors.push({ path, error });
      result.valid = result.valid && itemValid;
    } else {
      result.valid = false;
      error = `Unexpected name "${name}"`;
      result.errors.push({ path, error });
    }
  };
  api.definition.walk(data, definition, name, walker);
  return result;
};

api.definition.printErrors = (message, validationResult) => {
  if (validationResult.valid) return;

  impress.log.error(message);
  for (let i = 0; i < validationResult.errors.length; i++) {
    const error = validationResult.errors[i];
    impress.log.error(error.path + ' - ' + error.error);
  }
};
