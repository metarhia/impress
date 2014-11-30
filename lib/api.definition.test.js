'use strict';

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

    [ 'abc:string',      { type: 'string', optional: true, default: 'abc', str: 'abc:string'   } ],
    [ '[abc:string]',    { type: 'string', optional: true, default: 'abc', str: '[abc:string]' } ],
    [ '529:number',      { type: 'number', optional: true, default: '529', str: '529:number'   } ],
    [ '[730:number]',    { type: 'number', optional: true, default: '730', str: '[730:number]' } ],

    [ '{name}',          { type: 'struct',     optional: false, name: 'name', str: '{name}'   } ],
    [ '[{name}]',        { type: 'struct',     optional: true,  name: 'name', str: '[{name}]' } ],
    [ '{{name}}',        { type: 'collection', optional: false, name: 'name', str: '{{name}}' } ],
  ],
  'api.definition.validate': [
    [ { a: 5, b: 'b', c: [1,2,3] },
      { schema: { a: 'number', b: 'string', c: 'array' } }, 'schema',
      { valid: true,  errors: [] } ],
    [ { a: '5', b: 'b', c: [1,2,3] },
      { schema: { a: 'number', b: 'string', c: 'array' } }, 'schema',
      { valid: false, errors: [ { path: '.a', error: 'Unexpected value "5" for definition: number' } ] } ],
    [ { a: { b: { c: { d: 'e' } } } },
      { ab: '{b}', b: '{c}', c: '{d}', d: { d: 'string' } }, 'ab',
      { valid: true,  errors: [] } ],
    [ { a: { b: { c: { d: 'e' } } } },
      { ab: '{b}', b: '{c}', c: '{d}', d: { d: 'string' } }, 'abc',
      { valid: false, errors: [ { path: '.a', error: 'Unexpected name "a"' } ] } ],
    [ { a: { b: { c: { d: 123 } } } },
      { ab: '{b}', b: '{c}', c: '{d}', d: { d: 'number' } }, 'ab',
      { valid: true,  errors: [] } ],
    [ { a: { bb: { c: { d: 123 } } } },
      { ab: '{b}', b: '{c}', c: '{d}', d: { d: 'number' } }, 'ab',
      { valid: true,  errors: [] } ], // verify
    [ { name1: 'val1', name2: 'val2' },
      { name1: '(val1|val2|val3)', name2: '(val1|val2|val3)' }, 'name1',
      { valid: true,  errors: [] } ],
    [ { items: [ { a: 1 }, { a: 2 } ] },
      { schema: { items: '{{item}}' }, item: { a: 'number' } }, 'schema',
      { valid: true,  errors: [] } ],
  ]
});
