'use strict';

impress.test({
  'isInitialized': true,
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
