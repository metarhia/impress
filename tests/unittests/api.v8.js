'use strict';

function notOptimizedFunction(a, b) {
  return a + b;
}

function optimizedFunction(a, b) {
  return a + b;
}

optimizedFunction(1, 2);
api.v8.optimizeFunctionOnNextCall(optimizedFunction);
optimizedFunction(1, 2);

api.test.case({
  'api.v8.optimizeFunctionOnNextCall': [
    [ optimizedFunction, undefined ],
  ],
  'api.v8.getOptimizationStatus': [
    [ notOptimizedFunction, 2 ],
    [ optimizedFunction, 1 ],
  ],
  'api.v8.getOptimizationCount': [
    [ notOptimizedFunction, 0 ],
    [ optimizedFunction, 1 ],
  ],
  'api.v8.deoptimizeFunction': [
    [ optimizedFunction, undefined ],
  ],
  'api.v8.clearFunctionTypeFeedback': [
    [ notOptimizedFunction, undefined ],
    [ optimizedFunction,    undefined ],
  ],
  'api.v8.debugPrint': [
    [ 5,                 5 ],
    [ {},               {} ],
    [ [],               [] ],
    [ { a: 5 },   { a: 5 } ],
    [ { a: {} }, { a: {} } ],
    [ { a: [] }, { a: [] } ],
  ],
  'api.v8.collectGarbage': [ [] ],
  /*'api.v8.getHeapUsage': [
    [ [], (i) => (typeof(i) === 'number') ],
  ],*/
  'api.v8.functionGetName': [
    [ notOptimizedFunction, 'notOptimizedFunction' ],
    [ optimizedFunction,       'optimizedFunction' ],
  ],
  'api.v8.isInPrototypeChain': [
    [ Array, Object,            false ],
    [ 'Hello', Object,          false ],
    [ Object.prototype,   Array, true ],
    [ Object.prototype, 'Hello', true ],
  ],
  /*'api.v8.getV8Version': [
    [ [], (i) => (typeof(i) === 'string') ],
  ],*/
  'api.v8.OPT_STATUS': [
    [ [], (value) => (Array.isArray(value) && value.length === 8) ],
  ],
  'api.v8.optimizationStatus': [
    [ -1,        undefined ],
    [ 0,         'unknown' ],
    [ 1,       'optimized' ],
    [ 2,   'not optimized' ],
    [ null,      undefined ],
    [ undefined, undefined ],
  ],
});
