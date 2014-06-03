"use strict";

(function(impress) {

	impress.test = function(list) {
		impress.test.result.modules++;
		var expect, fnPath, fn, def, par, res, dat, msg, cmp;
		for (var functionName in list) {
			impress.test.result.functions++;
			expect = list[functionName];
			fn = impress.dataByPath(global, functionName);
			for (var i = 0; i < expect.length; i++) {
				impress.test.result.tests++;
				def = expect[i];
				par = def[0];
				res = def[1];
				dat = fn.apply(fn, par);
				msg = JSON.stringify(par);
				msg = functionName+'('+msg.substring(1,msg.length-1)+'), expected: '+JSON.stringify(res)+', result: '+JSON.stringify(dat)+' ';
				if (typeof(res) == "function") cmp = res(dat);
				else cmp = (dat == res);
				if (cmp) {
					impress.test.result.passed++;
					console.log(msg+'ok'.green);
				} else {
					impress.test.result.errors++;
					console.log(msg+'error'.red);
				}
			}
		}	
	};

	impress.test.clearResult = function() {
		impress.test.result = {
			modules:   0,
			functions: 0,
			tests:     0,
			passed:    0,
			errors:    0
		};
	};

	impress.test.clearResult();

	impress.test.printReport = function() {
		console.log(
			'\nTesting finished'.bold+
			'\n  Modules:   '+impress.test.result.modules+
			'\n  Functions: '+impress.test.result.functions+
			'\n  Tests:     '+impress.test.result.tests+
			'\n  Passed:    '+impress.test.result.passed+
			'\n  Errors:    '+impress.test.result.errors+
			'\nResult: '+(impress.test.result.errors == 0 ? 'PASSED'.green.bold : 'FAILED'.red.bold )
		);
	};

} (global.impress = global.impress || {}));