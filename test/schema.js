'use strict';

const metatests = require('metatests');
const { Schema } = require('../lib/schema.js');

metatests.test('lib/schema constructor', (test) => {
  const definition = { field1: 'string' };
  const schema = new Schema('StructName', definition);
  test.strictSame(schema.name, 'StructName');
  test.strictSame(schema.scope, 'system');
  test.strictSame(schema.kind, 'entity');
  test.strictSame(typeof schema.fields, 'object');
  test.strictSame(typeof schema.indexes, 'object');
  test.strictSame(schema.validate, null);
  test.strictSame(schema.format, null);
  test.strictSame(schema.parse, null);
  test.strictSame(schema.serialize, null);
  test.strictSame(schema.fields.field1.type, 'string');
  test.end();
});

metatests.test('lib/schema preprocess', (test) => {
  const definition = {
    field1: 'string',
    field2: { type: 'number' },
    field3: { type: 'string', length: 30 },
    field4: { type: 'string', length: { min: 10 } },
    field5: { type: 'string', length: [5, 60] },
  };
  const schema = Schema.from(definition);
  test.strictSame(schema.fields.field1.type, 'string');
  test.strictSame(schema.fields.field2.required, true);
  test.strictSame(schema.fields.field3.length.max, 30);
  test.strictSame(schema.fields.field4.length.min, 10);
  test.strictSame(schema.fields.field5.length.max, 60);
  test.strictSame(schema.fields.field5.length.min, 5);
  test.end();
});

metatests.test('lib/schema check', (test) => {
  const definition = {
    field1: 'string',
    field2: { type: 'number' },
    field3: { type: 'string', length: 30 },
    field4: { type: 'string', required: false },
    field5: {
      subfield1: 'number',
      subfield2: { type: 'string', required: false },
    },
  };
  const obj = {
    field1: 'value',
    field2: 100,
    field3: 'value',
    field5: {
      subfield1: 500,
      subfield2: 'value',
    },
  };
  const schema = Schema.from(definition);
  test.strictSame(schema.check(obj).valid, true);
  test.end();
});

metatests.test('lib/schema negative', (test) => {
  const definition = {
    field1: 'string',
    field2: { type: 'number' },
    field3: { type: 'string', length: { min: 5, max: 30 } },
  };
  const schema = Schema.from(definition);

  const obj1 = {
    field1: 1,
    field2: 100,
    field3: 'value',
  };
  test.strictSame(schema.check(obj1).valid, false);

  const obj2 = {
    field1: 'value',
    field2: 'value',
    field3: 'value',
  };
  test.strictSame(schema.check(obj2).valid, false);

  const obj3 = {
    field1: 'value',
    field2: 100,
    field3: 'valuevaluevaluevaluevaluevaluevaluevalue',
  };
  test.strictSame(schema.check(obj3).valid, false);

  const obj4 = {
    field1: 'value',
    field2: 100,
    field3: 'val',
  };
  test.strictSame(schema.check(obj4).valid, false);

  const obj5 = {
    field1: 'value',
    field2: 100,
  };
  test.strictSame(schema.check(obj5).valid, false);
  test.end();
});

metatests.test('lib/schema check scalar', (test) => {
  {
    const definition = { type: 'string' };
    const schema = Schema.from(definition);
    test.strictSame(schema.check('value').valid, true);
    test.strictSame(schema.check(1917).valid, false);
    test.strictSame(schema.check(true).valid, false);
    test.strictSame(schema.check({}).valid, false);
  }
  {
    const definition = 'string';
    const schema = Schema.from(definition);
    test.strictSame(schema.check('value').valid, true);
    test.strictSame(schema.check(1917).valid, false);
    test.strictSame(schema.check(true).valid, false);
    test.strictSame(schema.check({}).valid, false);
  }
  test.end();
});

metatests.test('lib/schema check collections', (test) => {
  const definition = {
    field1: { array: 'number' },
    field2: { object: { string: 'string' } },
  };
  const obj1 = {
    field1: [1, 2, 3],
    field2: { a: 'A', b: 'B' },
  };
  const schema = Schema.from(definition);
  test.strictSame(schema.check(obj1).valid, true);
  const obj2 = {
    field1: ['uno', 2, 3],
    field2: { a: 1, b: 'B' },
  };
  test.strictSame(schema.check(obj2).valid, false);
  test.end();
});
