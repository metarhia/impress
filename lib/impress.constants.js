'use strict';

impress.name = 'Impress Application Server';

impress.TPL_NOT_FOUND = 'Warning: template not found: ';
impress.CANT_READ_FILE = 'Can not read file: ';
impress.CANT_READ_DIR = 'Can not read directory: ';
impress.ALREADY_STARTED = 'Status: server is already started';

impress.FILE_EXISTS = 10;
impress.FILE_NOT_FOUND = 11;
impress.FILE_IS_EMPTY = 12;
impress.FILE_PARSE_ERROR = 13;

impress.HTTP_VEBS = [ 'get', 'post', 'put', 'delete' ];

impress.MIME_TYPES = {
  html:  'text/html; charset=UTF-8',
  txt:   'text/plain; charset=UTF-8',
  json:  'application/json; charset=UTF-8',
  jsonp: 'application/javascript; charset=UTF-8',
  sse:   'text/event-stream; charset=UTF-8',
  xml:   'text/xml; charset=UTF-8',
  kml:   'application/vnd.google-earth.kml+xml',
  csv:   'text/csv; charset=UTF-8',
  ajax:  'text/html; charset=UTF-8',
  js:    'application/javascript; charset=UTF-8',
  wav:   'audio/wav',
  mp3:   'audio/mpeg3',
  mid:   'audio/midi',
  css:   'text/css',
  png:   'image/png',
  gif:   'image/gif',
  jpg:   'image/jpeg',
  jpeg:  'image/jpeg',
  ogg:   'audio/ogg',
  ico:   'image/x-icon',
  manifest: 'text/cache-manifest',
  svg:   'image/svg+xml',
  svgz:  'image/svg+xml',
  tif:   'image/tiff',
  tiff:  'image/tiff',
  pdf:   'application/pdf',
  rtf:   'application/rtf',
  '7z':  'application/x-7z-compressed',
  rar:   'application/x-rar-compressed',
  zip:   'application/zip'
};

impress.COMPRESSED_EXT = [
  'gif','jpg','jpe','jpeg','png','svgz',
  'docx','xlsx','pptx','dotx','odm','odt','ott','odp','otp','djvu','djv',
  'zip','rar','z7','gz','jar','arj',
  'iso','nrg','img','apk',
  'mp2','mp3','mp4','avi','flv','fla','swf','3gp','mkv','mpeg','mpg','mpe','mov','asf','wmv','vob','ogg'
];

impress.COMPRESS_ABOVE = 256; // static files above this size should be gzipped

impress.STATUS_CODES = api.http.STATUS_CODES;
if (!impress.STATUS_CODES[508]) impress.STATUS_CODES[508] = 'Loop Detected';

impress.DEFAULT_ACCESS = {
  guests:  true,  // allow access for non-authenticated connections (no SID cookie)
  logged:  true,  // allow access for authenticated connections
  http:    true,  // allow via HTTP 
  https:   true,  // allow via HTTPS
  intro:   false, // allow API introspection
  index:   false, // allow directory index
  virtual: false, // allow virtual folders if true or reply 404 if false
  groups:  []     // allow access for certain groups (ampty list allows to all)
};

impress.DEFAULT_SANDBOX_MODULES = [
  // Node.js 
  'require',
  'console',
  'Buffer',
  'process',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',

  // Impress global names
  'db',
  'impress',
  'security'
];

impress.CONFIG_FILES_PRIORITY = [
  'sandbox.js',
  'log.js',
  'scale.js',
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

impress.API_ALIASES = {
  'geoip': 'geoip-lite',
  'zipstream': 'zip-stream',
  'stringify': 'json-stringify-safe'
};
