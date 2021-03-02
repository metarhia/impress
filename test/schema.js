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

metatests.test('lib/schema shorthand', (test) => {
  const definition = {
    field1: {
      n: { type: 'number', default: 100 },
      c: { type: 'string', shorthand: true },
    },
  };
  const schema = Schema.from(definition);

  const obj1 = { field1: 'value' };
  test.strictSame(schema.check(obj1).valid, true);

  const obj2 = { field1: 1 };
  test.strictSame(schema.check(obj2).valid, false);

  const obj3 = { field1: { n: 1, c: 'value' } };
  test.strictSame(schema.check(obj3).valid, true);

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
  const def1 = {
    field1: { array: 'number' },
  };
  const obj1 = {
    field1: [1, 2, 3],
  };
  const schema1 = Schema.from(def1);
  test.strictSame(schema1.check(obj1).valid, true);

  const def2 = {
    field1: { array: 'number' },
  };
  const obj2 = {
    field1: ['uno', 2, 3],
  };
  const schema2 = Schema.from(def2);
  test.strictSame(schema2.check(obj2).valid, false);

  const def3 = {
    field1: { object: { string: 'string' } },
  };
  const obj3 = {
    field1: { a: 'A', b: 'B' },
  };
  const schema3 = Schema.from(def3);
  test.strictSame(schema3.check(obj3).valid, true);

  const def4 = {
    field1: { object: { string: 'string' } },
  };
  const obj4 = {
    field1: { a: 1, b: 'B' },
  };
  const schema4 = Schema.from(def4);
  test.strictSame(schema4.check(obj4).valid, false);

  const def5 = {
    field1: { set: 'number' },
  };
  const obj5 = {
    field1: new Set([1, 2, 3]),
  };
  const schema5 = Schema.from(def5);
  test.strictSame(schema5.check(obj5).valid, true);

  const def6 = {
    field1: { set: 'number' },
  };
  const obj6 = {
    field1: new Set(['uno', 2, 3]),
  };
  const schema6 = Schema.from(def6);
  test.strictSame(schema6.check(obj6).valid, false);

  const def7 = {
    field1: { map: { string: 'string' } },
  };
  const obj7 = {
    field1: new Map([
      ['a', 'A'],
      ['b', 'B'],
    ]),
  };
  const schema7 = Schema.from(def7);
  test.strictSame(schema7.check(obj7).valid, true);

  const def8 = {
    field1: { map: { string: 'string' } },
  };
  const obj8 = {
    field1: new Set([
      ['a', 1],
      ['b', 'B'],
    ]),
  };
  const schema8 = Schema.from(def8);
  test.strictSame(schema8.check(obj8).valid, false);

  test.end();
});
