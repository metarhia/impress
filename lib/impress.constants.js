'use strict';

// Constants for Impress Application Server

impress.CANT_READ_FILE = 'Can not read file: ';
impress.CANT_READ_DIR = 'Can not read directory: ';

impress.FILE_EXISTS = 10;
impress.FILE_NOT_FOUND = 11;
impress.FILE_IS_EMPTY = 12;
impress.FILE_PARSE_ERROR = 13;

impress.DIR_EXISTS = 50;
impress.DIR_NOT_EXISTS = 51;

impress.HTTP_VERBS = [
  'get', 'post', 'put', 'delete', 'patch', 'head', 'options'
];

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
