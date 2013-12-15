(function(impress) {

	var uglify = impress.require("uglify-js");

	if (uglify) {
		impress.uglify = uglify;

		impress.minify = function(data) {
			try {
				return impress.uglify.minify(data.toString(), {fromString: true}).code;
			} catch(e) {
				impress.log.error('js parse error\n');
				return data;
			}
		}
	}	

} (global.impress = global.impress || {}));