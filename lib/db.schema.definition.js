module.exports = {

  schema: {
    caption:    'string',
    version:    'number',
    _other:     '{table}'
  },
  
  table: {
    caption:    'string',
    captions:   'object',
    comment:    'string',
    type:       [ 'system', 'dictionary', 'data', 'crossreference', 'view', 'query', 'log', 'unknown', 'set' ],
    fields:     '{{field}}',
    indexes:    '{{compositeIndex}}',
    server:     'object',
    client:     'object',
    data:       'array'   // '{{intertDefault}}'
  },

  /* intertDefault: { }, */

  field: {
    caption:    'string',
    captions:   'object',
    comment:    'string',
    type:       [ 'id', 'tree', 'uid', 'guid', 'ip', 'hash', 'int', 'float', 'str', 'char', 'date', 'time', 'datetime', 'money', 'bool', 'text' ],
    size:       'number',
    signed:     'boolean',
    subtype:    [ 'html', 'uri', 'json', 'checks', 'radios' ],
    nullable:   'boolean',
    hidden:     'boolean',
    readOnly:   'boolean',
    default:    'string',
    defaults:   'object',
    example:    'string',
    examples:   'object',
    primary:    'boolean',
    control:    [ 'combobox', 'combobox', 'autocomplete' ],
    dynamic:    'boolean',
    transform:  [ 'upper', 'lower', 'title', 'capitalize', 'normal' ],
    lookup:     '{lookup}',
    link:       '{link}',
    master:     '{master}',
    validation: '{validation}',
    index:      '{index}'
  },

  lookup: {
    type:       [ 'table', 'list', 'dictionary', 'tag' ],
    dataset:    'string',
    distinct:   'boolean',
    sort:       'boolean',
    key:        'string',
    result:     'string',
    list:       'object',
    dictionary: 'object'
  },

  link: {
    dataset:    'string',
    key:        'string'
  },

  master: {
    dataset:    'string',
    key:        'string',
    deletion:   [ 'cascade', 'restrict' ]
  },

  validation: {
    continuous: 'boolean',
    unique:     'boolean',
    length:     'string',
    value:      'string',
    regEx:      'string',
    message:    'string',
    messages:   'object',
    server:     'object',
    client:     'object'
  },

  index: {
    primary:    'boolean',
    unique:     'boolean',
    validationMessage:  'string',
    validationMessages: 'object'
  },

  compositeIndex: {
    fields:     'array',
    unique:     'boolean',
    validationMessage:  'string',
    validationMessages: 'object'
  }

};
