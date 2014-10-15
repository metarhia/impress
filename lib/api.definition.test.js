"use strict";

impress.test({
  'api.definition.parse': [
    [ 'number',          { type: 'number',   optional: false } ],
    [ 'string',          { type: 'string',   optional: false } ],
    [ 'array',           { type: 'array',    optional: false } ],
    [ 'boolean',         { type: 'boolean',  optional: false } ],
    [ 'file',            { type: 'file',     optional: false } ],
    [ 'size',            { type: 'size',     optional: false } ],
    [ 'duration',        { type: 'duration', optional: false } ],
    [ '(one,two,three)', { type: 'set',      optional: false, variants: ['one', 'two', 'three'] } ],
    [ '[number]',        { type: 'number',   optional: true  } ],
    [ '[boolean]',       { type: 'boolean',  optional: true  } ],

    [ 'abc:string',      { type: 'string', optional: false, default: 'abc' } ],
    [ '[abc:string]',    { type: 'string', optional: true,  default: 'abc' } ],
    [ '529:number',      { type: 'number', optional: false, default: '529' } ],
    [ '[730:number]',    { type: 'number', optional: true,  default: '730' } ],

    [ '{name}',          { type: 'struct',     optional: false, name: 'name' } ],
    [ '[{name}]',        { type: 'struct',     optional: true,  name: 'name' } ],
    [ '{{name}}',        { type: 'collection', optional: false, name: 'name' } ],
  ],
});
