module.exports = {

  schema: {
    caption:    'string',
    version:    '[number]',
    _other:     '{{table}}'
  },
  
  table: {
    caption:    '[string]',
    captions:   '{{caption}}',
    comment:    '[string]',
    type:       '[(system,dictionary,data,crossreference,view,query,log,unknown,set)]',
    fields:     '{{field}}',
    indexes:    '[{{compositeIndex}}]',
    server:     '[hash]',
    client:     '[hash]',
    data:       '[array]'   // '{{data}}' insert default data
  },

  caption: {
    _other: '[string]'
  },

  field: {
    caption:    '[string]',
    captions:   '{{caption}}',
    comment:    '[string]',
    type:       '(id,tree,uid,guid,ip,hash,int,float,str,char,date,time,datetime,money,bool,text)',
    size:       '[number]',
    signed:     '[boolean]',
    subtype:    '[(html,uri,json,checks,radios)]',
    nullable:   '[boolean]',
    hidden:     '[boolean]',
    readOnly:   '[boolean]',
    default:    '[string]',
    defaults:   '[hash]',
    example:    '[string]',
    examples:   '[hash]',
    primary:    '[boolean]',
    control:    '[(combobox,combobox,autocomplete)]',
    dynamic:    '[boolean]',
    transform:  '[(upper,lower,title,capitalize,normal)]',
    lookup:     '[{lookup}]',
    link:       '[{link}]',
    master:     '[{master}]',
    validation: '[{validation}]',
    index:      '[{index}]'
  },

  lookup: {
    type:       '(table,list,dictionary,tag)',
    dataset:    'string',
    distinct:   'boolean',
    sort:       'boolean',
    key:        'string',
    result:     'string',
    list:       'hash',
    dictionary: 'hash'
  },

  link: {
    dataset:    'string',
    key:        'string'
  },

  master: {
    dataset:    'string',
    key:        'string',
    deletion:   '(cascade,restrict)'
  },

  validation: {
    continuous: 'boolean',
    unique:     'boolean',
    length:     'string',
    value:      'string',
    regEx:      'string',
    message:    'string',
    messages:   'hash',
    server:     'hash',
    client:     'hash'
  },

  index: {
    primary:    '[boolean]',
    unique:     'false:boolean',
    validationMessage:  '[string]',
    validationMessages: '[hash]'
  },

  compositeIndex: {
    fields:     'array',
    unique:     'false:boolean',
    validationMessage:  '[string]',
    validationMessages: '[hash]'
  }

};
