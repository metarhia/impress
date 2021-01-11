'use strict';

const metatests = require('metatests');
const { Schema } = require('../lib/schema.js');

metatests.test('lib/schema', (test) => {
  const definition = {
    field1: 'string',
    field2: { type: 'number' },
  };
  const schema = new Schema('example', definition);
  test.strictSame(schema.fields.field1.type, 'string');
  test.strictSame(schema.fields.field2.required, true);
  test.end();
});
