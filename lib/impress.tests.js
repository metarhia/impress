"use strict";

impress.test = function(list) {
  impress.test.result.modules++;

  var conditions, target, targetType, targetValue, definition, msg, cmp,
      parameters, sParameters, expected, sExpected, expectedType, result, sResult,
      functionPath, className, methodName;
  var classes = [];

  for (var functionName in list) {
    conditions = list[functionName];
    if (functionName.contains(".prototype.")) {
      functionPath = functionName.split('.');
      className = functionPath[0];
      methodName = functionPath[2];
      if (!inArray(classes, className)) {
        classes.push(className);
        impress.test.result.classes++;
      }
      targetType = 'method';
    } else {
      target = impress.dataByPath(global, functionName);
      targetType = typeof(target);
    }
    /**/ if (targetType === 'function') impress.test.result.functions++;
    else if (targetType === 'method') impress.test.result.methods++;
    else impress.test.result.values++;
    impress.test.result.targets++;

    for (var i = 0; i < conditions.length; i++) {
      impress.test.result.tests++;
      definition = conditions[i];

      expected = definition.pop();
      expectedType = typeof(expected);
      if (expectedType === 'function') sExpected = 'function';
      else if (expectedType === 'string') sExpected = '"'+expected+'"';
      else sExpected = JSON.stringify(expected);

      if (targetType === 'method') target = definition.shift();

      parameters = definition;
      sParameters = JSON.stringify(parameters);

      if (targetType === 'function') result = target.apply(target, parameters);
      else if (targetType === 'method') {
        if (target !== null) result = target[methodName].apply(target, parameters);
        else result = null;
      } else { targetType = 'value'; result = target; }

      if (result instanceof RegExp) {
        sResult = result.toString()+'';
        sResult = '"'+sResult.substring(1, sResult.length-1)+'"';
      } else sResult = JSON.stringify(result);

      if (targetType === 'method') {
        targetValue = target;
        if (target === null) targetValue = '';
        else targetValue = JSON.stringify(target);
        msg = targetType+' of '+className+': '+targetValue+'.'+methodName;

      } else msg = targetType+' '+functionName;

      if (targetType === 'function' || targetType === 'method') msg +='('+sParameters.substring(1, sParameters.length-1)+')';
      msg += ', expected: '+sExpected+', result: '+sResult+' ';

      if (expectedType === 'function') cmp = expected(result);
      else cmp = (sResult === sExpected);

      if (cmp) {
        impress.test.result.passed++;
        if (impress.test.show.ok) console.log(msg+'ok'.green);
      } else {
        impress.test.result.errors++;
        if (impress.test.show.error) console.log(msg+'error'.red);
      }
    }
  }  
};

impress.test.show = {
  ok: true,
  error: true
};

impress.test.color = true;

impress.test.clearResult = function() {
  impress.test.result = {
    modules:   0,
    targets:   0,
    functions: 0,
    values:    0,
    classes:   0,
    methods:   0,
    tests:     0,
    passed:    0,
    errors:    0
  };
};

impress.test.clearResult();

impress.test.printReport = function() {
  console.log(
    '\nTest finished with following results:'.bold+
    '\n  Modules:   '+impress.test.result.modules+
    '\n  Targets:   '+impress.test.result.targets+
    '\n  Functions: '+impress.test.result.functions+
    '\n  Values:    '+impress.test.result.values+
    '\n  Classes:   '+impress.test.result.classes+
    '\n  Methods:   '+impress.test.result.methods+
    '\n  Tests:     '+impress.test.result.tests+
    '\n  Passed:    '+impress.test.result.passed+
    '\n  Errors:    '+impress.test.result.errors+
    '\nResult: '+(impress.test.result.errors === 0 ? 'PASSED'.green.bold : 'FAILED'.red.bold )
  );
};
