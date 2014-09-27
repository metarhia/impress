"use strict";

impress.name = 'Impress Application Server';

impress.templateNotFound = 'Warning: template not found: ';
impress.canNotReadFile = 'Can not read file: ';
impress.canNotReadDirectory = 'Can not read directory: ';

impress.fileNotFound = 10;
impress.fileIsEmpty = 11;
impress.fileExists = 12;

impress.defaultSlowTime = '2s';

impress.httpVerbs = [ 'get', 'post', 'put', 'delete' ];

impress.mimeTypes = {
  html:  'text/html; charset=UTF-8',
  txt:   'text/plain; charset=UTF-8',
  json:  'application/json; charset=UTF-8',
  jsonp: 'application/javascript; charset=UTF-8',
  sse:   'text/event-stream; charset=UTF-8',
  xml:   'text/xml; charset=UTF-8',
  kml:   'application/vnd.google-earth.kml+xml',
  csv:   'application/csv; charset=UTF-8',
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

impress.compressedExt = [
  'gif','jpg','jpe','jpeg','png','svgz',
  'docx','xlsx','pptx','dotx','odm','odt','ott','odp','otp','djvu','djv',
  'zip','rar','z7','gz','jar','arj',
  'iso','nrg','img','apk',
  'mp2','mp3','mp4','avi','flv','fla','swf','3gp','mkv','mpeg','mpg','mpe','mov','asf','wmv','vob','ogg'
];

impress.compressAbove = 256; // static files above this size should be gzipped

impress.httpErrorCodes = api.http.STATUS_CODES;
if (!impress.httpErrorCodes[508]) impress.httpErrorCodes[508] = 'Loop Detected';

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
