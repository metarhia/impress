(function(impress) {

	impress.uglify = require("uglify-js");

	impress.minify = function(data) {
		try {
			return impress.uglify.minify(data.toString(), {fromString: true}).code;
		} catch(e) {
			console.log('js parse error\n');
			return data;
		}
	}

} (global.impress = global.impress || {}));