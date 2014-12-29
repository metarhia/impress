'use strict';

var methodConteiner = {};
methodConteiner.method = function(obj) {
  obj.field = 'value';
  return obj;
};

impress.test({
  'Function.prototype.override': [
    [
      methodConteiner.method,
      function(obj) {
        obj.data++;
        return this.inherited(obj);
      },
      function(fn) {
        methodConteiner.method = fn;
        return methodConteiner.method({ data:123 }).data === 124;
      }
    ]
  ],
  'isBrowser': [ [ [], false ] ],
  'isServer':  [ [ [], true  ] ],
  'falseness': [ [ [], false ] ],
  'isInitialized': true,
  'inArray': [
    [ [1, 2, 3], 1,             true  ],
    [ [1, 2, 3], 4,             false ],
    [ ['e1', 'e2', 'e3'], 'e3', true  ],
    [ ['e1', 'e2', 'e3'], 'e4', false ],
    [ [1, null, 3], null,        true ],
  ],
  'Array.prototype.merge': [
    [ ['a', 'b'], ['a', 'c'],       ['a', 'b', 'c'] ],
    [ ['a', 'b'], ['a', 'b'],            ['a', 'b'] ],
    [ ['b', 'c'], ['a', 'b'],       ['b', 'c', 'a'] ],
    [ ['a', 'b'], ['c', 'd'], ['a', 'b' , 'c', 'd'] ],
    [ [1, 2, 3],  [1, 2, 3],              [1, 2, 3] ],
    [ [1, 2, 3],  [4, 5, 1],        [1, 2, 3, 4, 5] ],
  ],
  'String.prototype.startsWith': [
    [ 'abc', 'a',   true  ],
    [ 'abc', 'b',   false ],
    [ 'abc', 'c',   false ],
    [ 'abc', ' ',   false ],
    [ 'abc', '+',   false ],
    [ 'abc', '' ,   true  ],
    [ 'abc', 'abc', true  ],
  ],
  'String.prototype.endsWith': [
    [ 'abc', 'a',   false ],
    [ 'abc', 'b',   false ],
    [ 'abc', 'c',   true  ],
    [ 'abc', ' ',   false ],
    [ 'abc', '+',   false ],
    [ 'abc', '' ,   true  ],
    [ 'abc', 'abc', true  ],
  ],
  'String.prototype.contains': [
    [ 'abc', 'a',     true  ],
    [ 'abc', 'b',     true  ],
    [ 'abc', 'c',     true  ],
    [ 'abc', 'ab',    true  ],
    [ 'abc', 'bc',    true  ],
    [ 'abc', 'abc',   true  ],
    [ 'abc', 'ac',    false ],
    [ 'abc', ' ',     false ],
    [ 'abc', 'abcde', false ],
    [ 'abc', '+',     false ],
    [ 'abc', '',      true  ],
  ],
});
