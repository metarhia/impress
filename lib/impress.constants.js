(function(impress) {

	impress.templateNotFound = "Warning: template not found: ";
	impress.fileNotFound = 10;
	impress.fileIsEmpty = 11;
	
	impress.mimeTypes = {
		html:  "text/html; charset=UTF-8",
		txt:   "text/plain; charset=UTF-8",
		json:  "application/json; charset=UTF-8",
		jsonp: "application/javascript",
		sse:   "text/event-stream",
		xml:   "text/xml; charset=UTF-8",
		kml:   "application/vnd.google-earth.kml+xml",
		js:    "text/javascript",
		wav:   "audio/wav",
		css:   "text/css",
		mp3:   "audio/mpeg3",
		csv:   "application/csv",
		ajax:  "text/html; charset=UTF-8",
		png:   "image/png",
		gif:   "image/gif",
		jpg:   "image/jpeg",
		jpeg:  "image/jpeg",
		ogg:   "audio/ogg",
		ico:   "image/x-icon"
	};

	impress.customHttpCodes = {
		mp3: 206,
		ogg: 206,
		wav: 206
	};

	impress.httpErrorCodes = {
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
	};

} (global.impress = global.impress || {}));