'use strict';

// Simple unit tests and speed tests for Impress Application Server

// Speed tests
//   caption - test caption
//   count - call count
//   fn - function to be called
//
api.test.speed = (caption, count, fn) => {
  console.log(caption);
  const startTime = new Date().getTime();
  let i;
  for (i = 0; i < count; i++) fn();
  const endTime = new Date().getTime();
  const processingTime = endTime - startTime;
  console.log('Processing time: ' + processingTime + '\n');
};

// Execute tests list
//   list - hash of Array
//     hash keys are function and method names
//     Array contains call parameters
//     last Array item is an expected result (to compare)
//     or function (pass result to compare)
//
api.test.case = (list) => {
  api.test.case.result.modules++;

  let conditions, target, targetType, targetValue, definition, msg, cmp,
      parameters, sParameters, expected, sExpected, expectedType,
      result, sResult, functionPath, className, methodName, functionName;
  const classes = [];

  for (functionName in list) {
    conditions = list[functionName];
    if (functionName.includes('.prototype.')) {
      functionPath = functionName.split('.');
      className = functionPath[0];
      methodName = functionPath[2];
      if (!api.common.inArray(classes, className)) {
        classes.push(className);
        api.test.case.result.classes++;
      }
      targetType = 'method';
    } else {
      target = api.common.getByPath(global, functionName);
      targetType = typeof(target);
    }
    if (targetType === 'function') api.test.case.result.functions++;
    else if (targetType === 'method') api.test.case.result.methods++;
    else api.test.case.result.values++;
    api.test.case.result.targets++;

    for (let i = 0, len = conditions.length; i < len; i++) {
      api.test.case.result.tests++;
      definition = conditions[i];

      expected = definition.pop();
      expectedType = typeof(expected);
      if (expectedType === 'function') sExpected = 'function';
      else if (expectedType === 'string') sExpected = '"' + expected + '"';
      else sExpected = api.json.stringify(expected);

      if (targetType === 'method') target = definition.shift();

      parameters = definition;
      sParameters = api.json.stringify(parameters);

      if (targetType === 'function') {
        result = target.apply(target, parameters);
      } else if (targetType === 'method') {
        if (target !== null) {
          result = target[methodName](...parameters);
        } else result = null;
      } else {
        targetType = 'value';
        result = target;
      }

      if (result instanceof RegExp) {
        sResult = result.toString() + '';
        sResult = '"' + sResult.substring(1, sResult.length - 1) + '"';
      } else if (result instanceof Buffer) {
        sResult = result.toString();
      } else sResult = api.json.stringify(result);

      if (targetType === 'method') {
        targetValue = target;
        if (target === null) targetValue = '';
        else targetValue = api.json.stringify(target);
        msg = (
          targetType + ' of ' + className +
          ': ' + targetValue + '.' + methodName
        );
      } else {
        msg = targetType + ' ' + functionName;
      }

      if (targetType === 'function' || targetType === 'method') {
        msg += '(' + sParameters.substring(1, sParameters.length - 1) + ')';
      }
      msg += ', expected: ' + sExpected + ', result: ' + sResult + ' ';

      if (expectedType === 'function') cmp = expected(result);
      else cmp = (sResult === sExpected);

      if (cmp) {
        api.test.case.result.passed++;
        if (api.test.case.show.ok) console.log(msg + 'ok'.green);
      } else {
        api.test.case.result.errors++;
        if (api.test.case.show.error) console.log(msg + 'error'.red.bold);
      }
    }
  }
};

api.test.case.show = {
  ok: true,
  error: true
};

api.test.case.color = true;

// Clear test results
//
api.test.case.clearResult = () => {
  api.test.case.result = {
    modules: 0,
    targets: 0,
    functions: 0,
    values: 0,
    classes: 0,
    methods: 0,
    tests: 0,
    passed: 0,
    errors: 0
  };
};

api.test.case.clearResult();

// Print test results
//
api.test.case.printReport = () => {
  console.log(
    '\nTest finished with following results:'.bold +
    '\n  Modules:   ' + api.test.case.result.modules +
    '\n  Targets:   ' + api.test.case.result.targets +
    '\n  Functions: ' + api.test.case.result.functions +
    '\n  Values:    ' + api.test.case.result.values +
    '\n  Classes:   ' + api.test.case.result.classes +
    '\n  Methods:   ' + api.test.case.result.methods +
    '\n  Tests:     ' + api.test.case.result.tests +
    '\n  Passed:    ' + api.test.case.result.passed +
    '\n  Errors:    ' + api.test.case.result.errors +
    '\nResult: ' + (
      api.test.case.result.errors === 0 ?
      'PASSED'.green.bold : 'FAILED'.red.bold
    )
  );
};
