"use strict";

impress.test({
  'api.definition.parse': [
    [ 'number',          { type: 'number',   optional: false, str: 'number'   } ],
    [ 'string',          { type: 'string',   optional: false, str: 'string'   } ],
    [ 'array',           { type: 'array',    optional: false, str: 'array'    } ],
    [ 'boolean',         { type: 'boolean',  optional: false, str: 'boolean'  } ],
    [ 'file',            { type: 'file',     optional: false, str: 'file'     } ],
    [ 'size',            { type: 'size',     optional: false, str: 'size'     } ],
    [ 'duration',        { type: 'duration', optional: false, str: 'duration' } ],
    [ '(one,two,three)', { type: 'set',      optional: false, variants: ['one', 'two', 'three'], str: '(one,two,three)' } ],
    [ '[number]',        { type: 'number',   optional: true, str: '[number]'  } ],
    [ '[boolean]',       { type: 'boolean',  optional: true, str: '[boolean]' } ],

    [ 'abc:string',      { type: 'string', optional: false, default: 'abc', str: 'abc:string'   } ],
    [ '[abc:string]',    { type: 'string', optional: true,  default: 'abc', str: '[abc:string]' } ],
    [ '529:number',      { type: 'number', optional: false, default: '529', str: '529:number'   } ],
    [ '[730:number]',    { type: 'number', optional: true,  default: '730', str: '[730:number]' } ],

    [ '{name}',          { type: 'struct',     optional: false, name: 'name', str: '{name}'   } ],
    [ '[{name}]',        { type: 'struct',     optional: true,  name: 'name', str: '[{name}]' } ],
    [ '{{name}}',        { type: 'collection', optional: false, name: 'name', str: '{{name}}' } ],
  ],
});
