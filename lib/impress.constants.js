"use strict";

impress.name = 'Impress Application Server';

impress.templateNotFound = "Warning: template not found: ";
impress.fileNotFound = 10;
impress.fileIsEmpty = 11;
impress.fileExists = 12;

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
	js:    "application/javascript; charset=UTF-8",
	wav:   "audio/wav",
	mp3:   "audio/mpeg3",
	mid:   "audio/midi",
	css:   "text/css",
	png:   "image/png",
	gif:   "image/gif",
	jpg:   "image/jpeg",
	jpeg:  "image/jpeg",
	ogg:   "audio/ogg",
	ico:   "image/x-icon",
	manifest: "text/cache-manifest",
	svg:   "image/svg+xml",
	svgz:  "image/svg+xml",
	tif:   "image/tiff",
	tiff:  "image/tiff",
	pdf:   "application/pdf",
	rtf:   "application/rtf",
	"7z":  "application/x-7z-compressed",
	rar:   "application/x-rar-compressed",
	zip:   "application/zip"
};

impress.compressedExt = ["png", "jpg", "jpeg", "gif", "mp3", "ogg"];

impress.compressAbove = 256; // static files above this size should be gzipped

impress.customHttpCodes = {
	mp3: 206,
	ogg: 206,
	wav: 206
};

impress.httpErrorCodes = {
	301: "Moved Permanently",
	302: "Moved Temporarily",
	304: "Not Modified",
	400: "Bad request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "File not found",
	405: "Method Not Allowed",
	408: "Request Timeout",
	429: "Too Many Requests",
	500: "Internal Server Error",
	501: "Not implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	508: "Loop Detected",
	510: "Not Extended"
};

impress.defaultAccess = {
	guests:  true,  // allow access for non-authenticated connections (no SID cookie)
	logged:  true,  // allow access for authenticated connections
	http:    true,  // allow via HTTP 
	https:   true,  // allow via HTTPS
	intro:   false, // allow API introspection
	index:   false, // allow directory index
	virtual: false, // allow virtual folders if true or reply 404 if false
	groups:  []     // allow access for certain groups (ampty list allows to all)
};

impress.defaultSandboxModules = [
	// modules from global context
	'require',
	'console',
	'process',
	'db',
	'cms',
	// system modules
	'os',
	'vm',
	'domain',
	'crypto',
	'net',
	'http',
	'https',
	'dgram',
	'dns',
	'url',
	'path',
	'fs',
	'util',
	'events',
	'querystring',
	'stream',
	'zlib',
	// additional modules
	'async',
	'iconv',
	'geoip',
	'nodemailer',
	'Buffer'
];

impress.configFilesPriority = [
	'sandbox.js',
	'plugins.js',
	'log.js',
	'cloud.js',
	'cluster.js',
	'servers.js',
	'databases.js',
	'sessions.js',
	'tasks.js',
	'application.js',
	'files.js',
	'filestorage.js',
	'mail.js',
	'hosts.js',
	'routes.js',
	'passport.js'
];