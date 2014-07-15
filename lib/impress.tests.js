"use strict";

impress.test = function(list) {
	impress.test.result.modules++;
	var conditions, target, targetType, definition, msg, cmp;
	var parameters, sParameters, expected, sExpected, expectedType, result, sResult;
	for (var functionName in list) {
		conditions = list[functionName];
		target = impress.dataByPath(global, functionName);
		targetType = typeof(target);
		if (targetType === 'function') impress.test.result.functions++;
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

			parameters = definition;
			sParameters = JSON.stringify(parameters);

			if (targetType === 'function') result = target.apply(target, parameters);
			else { targetType = 'value'; result = target; }

			if (result instanceof RegExp) {
				sResult = result.toString()+'';
				sResult = '"'+sResult.substring(1, sResult.length-1)+'"';
			} else sResult = JSON.stringify(result);

			msg = targetType+' '+functionName;
			if (targetType === 'function') msg +='('+sParameters.substring(1, sParameters.length-1)+')';
			msg += ', expected: '+sExpected+', result: '+sResult+' ';

			if (expectedType === "function") cmp = expected(result);
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
	error: true,
};

impress.test.color = true;

impress.test.clearResult = function() {
	impress.test.result = {
		modules:   0,
		targets:   0,
		functions: 0,
		values:    0,
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
		'\n  Tests:     '+impress.test.result.tests+
		'\n  Passed:    '+impress.test.result.passed+
		'\n  Errors:    '+impress.test.result.errors+
		'\nResult: '+(impress.test.result.errors === 0 ? 'PASSED'.green.bold : 'FAILED'.red.bold )
	);
};