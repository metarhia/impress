'use strict';

// V8 internal functions for Impress Application Server

api.v8 = {};

/* jshint ignore:start */

api.v8.getOptimizationStatus = function(fn) { return %GetOptimizationStatus(fn); };
api.v8.getOptimizationCount = function(fn) { return %GetOptimizationCount(fn); };

api.v8.optimizeFunctionOnNextCall = function(fn) { return %OptimizeFunctionOnNextCall(fn); };
api.v8.deoptimizeFunction = function(fn) { return %DeoptimizeFunction(fn); };

api.v8.clearFunctionTypeFeedback = function(fn) { return %ClearFunctionTypeFeedback(fn); };
api.v8.debugPrint = function(data) { return %DebugPrint(data); };
api.v8.collectGarbage = function() { return %CollectGarbage(null); };
api.v8.getHeapUsage = function() { return %GetHeapUsage(); };

api.v8.hasFastProperties = function(data) { return %HasFastProperties(data); };
api.v8.hasFastSmiElements = function(data) { return %HasFastSmiElements(data); };
api.v8.hasFastObjectElements = function(data) { return %HasFastObjectElements(data); };
api.v8.hasFastDoubleElements = function(data) { return %HasFastDoubleElements(data); };
api.v8.hasDictionaryElements = function(data) { return %HasDictionaryElements(data); };
api.v8.hasFastHoleyElements = function(data) { return %HasFastHoleyElements(data); };
api.v8.hasFastSmiOrObjectElements = function(data) { return %HasFastSmiOrObjectElements(data); };
api.v8.hasSloppyArgumentsElements = function(data) { return %HasSloppyArgumentsElements(data); };

api.v8.functionGetName = function(func) { return %FunctionGetName(func); };
api.v8.isInPrototypeChain = function(value, proto) { return %IsInPrototypeChain(value, proto); };
api.v8.getV8Version = function() { return %GetV8Version(); };

/* jshint ignore:end */

api.v8.OPT_STATUS = [
  /*0*/ 'unknown',
  /*1*/ 'optimized',
  /*2*/ 'not optimized',
  /*3*/ 'always optimized',
  /*4*/ 'never optimized',
  /*5*/ 'unknown',
  /*6*/ 'maybe deoptimized',
  /*7*/ 'turbofan optimized'
];

api.v8.optimizationStatus = function(status) {
  return api.v8.OPT_STATUS[status];
};

api.v8.getOptimizationToString = function(fn) {
  var status = api.v8.getOptimizationStatus(fn);
  return api.v8.optimizationStatus(status);
};
