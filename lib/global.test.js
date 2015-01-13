'use strict';

var methodConteiner = {};
methodConteiner.method = function(obj) {
  obj.field = 'value';
  return obj;
};

impress.test({
  'isInitialized': true,
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
