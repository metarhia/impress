(function(impress) {

	impress.templateNotFound = "Warning: template not found: ";
	impress.fileNotFound = 10;
	impress.fileIsEmpty = 11;

	impress.defaultSlowTime = "2s";

	impress.mimeTypes = {
		html:  "text/html; charset=UTF-8",
		txt:   "text/plain; charset=UTF-8",
		json:  "application/json; charset=UTF-8",
		jsonp: "application/javascript; charset=UTF-8",
		sse:   "text/event-stream; charset=UTF-8",
		xml:   "text/xml; charset=UTF-8",
		kml:   "application/vnd.google-earth.kml+xml",
		csv:   "application/csv; charset=UTF-8",
		ajax:  "text/html; charset=UTF-8",
		js:    "text/javascript; charset=UTF-8",
		wav:   "audio/wav",
		css:   "text/css",
		mp3:   "audio/mpeg3",
		png:   "image/png",
		gif:   "image/gif",
		jpg:   "image/jpeg",
		jpeg:  "image/jpeg",
		ogg:   "audio/ogg",
		ico:   "image/x-icon",
		manifest: "text/cache-manifest",
		svg:   "image/svg+xml"
	};

	impress.compressedExt = ["png", "jpg", "jpeg", "gif", "mp3", "ogg"];

	impress.compressAbove = 256; // static files above this size should be gzipped

	impress.customHttpCodes = {
		mp3: 206,
		ogg: 206,
		wav: 206
	};

	impress.httpErrorCodes = {
		400: "Bad request",
		404: "File not found",
		301: "Moved Permanently",
		302: "Moved Temporarily",
		304: "Not Modified",
		400: "Bad Request",
		401: "Unauthorized",
		403: "Forbidden",
		404: "Not Found",
		408: "Request Timeout",
		429: "Too Many Requests",
		500: "Internal Server Error",
		502: "Bad Gateway",
		503: "Service Unavailable",
		504: "Gateway Timeout",
		510: "Not Extended"
	};

	impress.defaultAccess = {
		guests: true,
		logged: true,
		http:   true,
		https:  true,
		groups: []
	};

} (global.impress = global.impress || {}));