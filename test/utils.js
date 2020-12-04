'use strict';

const metatests = require('metatests');
const utils = require('../lib/utils.js');

metatests.test('lib/utils.makePrivate', test => {
  const obj = {
    field: 'value',
    CONSTANT: 1000,
    method(a, b) {
      return a + b;
    },
  };
  const iface = utils.makePrivate(obj);
  test.strictSame(typeof iface, 'object');
  test.strictSame(obj === iface, false);
  test.strictSame(iface.field, undefined);
  test.strictSame(iface.CONSTANT, 1000);
  test.strictSame(typeof iface.method, 'function');
  test.strictSame(iface.method(3, 5), 8);
  test.end();
});

metatests.test('lib/utils.protect', test => {
  const obj1 = {
    field1: 'value1',
    module1: {
      method(a, b) {
        return a + b;
      },
    },
  };
  const obj2 = {
    field2: 'value2',
    module2: {
      method(a, b) {
        return a + b;
      },
    },
  };
  utils.protect(['module1'], obj1, obj2);
  try {
    obj1.field1 = 100;
    test.strictSame(obj1.field1, 100);
    obj1.module1.method = () => {};
    test.strictSame(obj1.module1.method(3, 5), undefined);
  } catch (err) {
    test.error(err);
  }
  try {
    obj2.field1 = 200;
    test.strictSame(obj2.field1, 200);
    obj2.module2.method = () => {};
    test.strictSame(obj2.module2.method(3, 5), 8);
  } catch (err) {
    test.strictSame(err.constructor.name, 'TypeError');
  }
  test.end();
});
