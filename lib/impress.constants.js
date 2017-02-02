'use strict';

// Constants for Impress Application Server

impress.name = 'impress';

impress.MEMORY_LIMIT = 900000;
impress.MEMORY_LIMIT_CHECK_INTERVAL = 5000;
impress.SCRIPT_PREPARE_TIMEOUT = 500;

impress.TPL_NOT_FOUND = 'Warning: template not found: ';
impress.CANT_READ_FILE = 'Can not read file: ';
impress.CANT_READ_DIR = 'Can not read directory: ';
impress.ALREADY_STARTED = 'Status: server is already started';

impress.FILE_EXISTS = 10;
impress.FILE_NOT_FOUND = 11;
impress.FILE_IS_EMPTY = 12;
impress.FILE_PARSE_ERROR = 13;

impress.DIR_EXISTS = 50;
impress.DIR_NOT_EXISTS = 51;

impress.USE_STRICT = '"use strict";\n';
impress.ASCII_BRACE_OPENING = 123;

impress.CORE_PLUGINS = [
  'log', 'cache', 'application', 'client',
  'index', 'files', 'templating', 'preprocess',
  'security', 'state', 'cloud', 'jstp',
  'sse', 'websocket', 'health', 'firewall'
];

impress.HTTP_VERBS = [
  'get', 'post', 'put', 'delete', 'patch', 'head', 'options'
];

impress.UPLOAD_SIZE_ZIP = 1048576;

impress.MIME_TYPES = {
  html:  'text/html; charset=UTF-8', // alias 'ajax'
  txt:   'text/plain; charset=UTF-8',
  json:  'application/json; charset=UTF-8',
  jsonp: 'application/javascript; charset=UTF-8',
  sse:   'text/event-stream; charset=UTF-8',
  xml:   'text/xml; charset=UTF-8',
  kml:   'application/vnd.google-earth.kml+xml',
  csv:   'text/csv; charset=UTF-8',
  js:    'application/javascript; charset=UTF-8',
  wav:   'audio/wav',
  mp3:   'audio/mpeg3',
  mp4:   'video/mp4',
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
  zip:   'application/zip',
  woff:  'application/font-woff',
  otf:   'application/font-sfnt',
  ttf:   'application/font-sfnt',
  eot:   'application/vnd.ms-fontobject'
};

impress.COMPRESSED_EXT = [
  'gif', 'jpg', 'jpe', 'jpeg', 'png', 'svgz',
  'docx', 'xlsx', 'pptx', 'dotx', 'odm', 'odt', 'ott', 'odp', 'otp',
  'djvu', 'djv',
  'zip', 'rar', 'z7', 'gz', 'jar', 'arj',
  'iso', 'nrg', 'img', 'apk',
  'mp2', 'mp3', 'mp4', 'avi', 'flv', 'fla', 'swf', '3gp',
  'mkv', 'mpeg', 'mpg', 'mpe', 'mov', 'asf', 'wmv', 'vob', 'ogg'
];

impress.COMPRESS_ABOVE = 256; // static files above this size should be gzipped

impress.STATUS_CODES = api.http.STATUS_CODES;
if (!impress.STATUS_CODES[508]) impress.STATUS_CODES[508] = 'Loop Detected';

impress.DEFAULT_ACCESS = {
  guests: true, // allow access for non-authenticated connections
  logged: true, // allow access for authenticated connections
  http: true, // allow via HTTP
  https: true, // allow via HTTPS
  intro: false, // allow API introspection
  virtual: false, // allow virtual folders if true or reply 404 if false
  groups: [] // allow access for certain groups (ampty list allows to all)
};

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

impress.ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
impress.ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz';
impress.ALPHA = impress.ALPHA_UPPER + impress.ALPHA_LOWER;
impress.DIGIT = '0123456789';
impress.ALPHA_DIGIT = impress.ALPHA + impress.DIGIT;
impress.REGEXP_IPV4_TO_IPV6 = new RegExp('^[:f]*', 'g');
impress.ROUTE_NUM_REGEXP = /\[([0-9]+)]/g;
impress.BACKSLASH_REGEXP = /\\/g;
impress.RANGE_BYTES_REGEXP = /bytes=/;

impress.HANDLER_TYPES = {
  '': 'dir',
  json: 'JSON Handler',
  jsonp: 'JSONP Handler',
  csv: 'CSV Data',
  ajax: 'AJAX Template',
  sse: 'Server-Sent Events',
  ws: 'WebSocket',
  rpc: 'Impress RPC'
};

impress.COOKIES_EXPIRES = (
  '=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain='
);

impress.DEFAULT_SANDBOX = [
  'require',
  'console',
  'Buffer',
  'SlowBuffer',
  'process',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate'
];

impress.DEFAULT_API = [
  // Node internal modules
  'console', 'os', 'fs', 'sd', 'tls', 'net', 'dns', 'url',
  'util', 'path', 'zlib', 'http', 'https', 'dgram',
  'stream', 'buffer', 'crypto', 'events',
  'readline', 'querystring', 'timers',

  // Impress API modules
  'db', 'con', 'common', 'impress', 'registry', 'definition',

  // Preinstalled modules
  'metasync', 'csv', 'async', 'iconv', 'colors',
  'zipStream', // npm module zip-stream
  'jstp',      // npm module metarhia-jstp
];

// Preparing stack trace transformations
impress.STACK_REGEXP = [
  [process.cwd() + api.common.pathSeparator + 'node_modules', ''],
  [process.cwd() + api.common.pathSeparator + 'lib', ''],
  [process.cwd(), ''],
  [/\n\s{4,}at/g, ';'],
  [/\n/g, ';'],
  [/[\t^]/g, ' '],
  [/\s{2,}/g, ' '],
  [/;\s;/g, ';']
];

// Escape STACK_REGEXP
impress.STACK_REGEXP.forEach((item) => {
  if (typeof(item[0]) === 'string') {
    item[0] = api.common.newEscapedRegExp(item[0]);
  }
});
