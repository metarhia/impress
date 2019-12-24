'use strict';

module.exports = {

  CANT_READ_FILE: 'Can not read file: ',
  CANT_READ_DIR: 'Can not read directory: ',
  CANT_WRITE_FILE: 'Can not write to file: ',

  FILE_EXISTS: 10,
  FILE_NOT_FOUND: 11,
  FILE_IS_EMPTY: 12,
  FILE_PARSE_ERROR: 13,

  DIR_EXISTS: 50,
  DIR_NOT_EXISTS: 51,

  COMPRESSED_EXT: [
    'gif', 'jpg', 'jpe', 'jpeg', 'png', 'svgz',
    'docx', 'xlsx', 'pptx', 'dotx', 'odm', 'odt', 'ott', 'odp', 'otp',
    'djvu', 'djv',
    'zip', 'rar', 'z7', 'gz', 'jar', 'arj',
    'iso', 'nrg', 'img', 'apk',
    'mp2', 'mp3', 'mp4', 'avi', 'flv', 'fla', 'swf', '3gp',
    'mkv', 'mpeg', 'mpg', 'mpe', 'mov', 'asf', 'wmv', 'vob', 'ogg'
  ],

  NOT_COMPRESSED_EXT: [
    'txt', 'pdf', 'doc', 'dot', 'xls', 'ppt', 'rtf',
    'eml', 'uu', 'uue',
    'css', 'htm', 'html', 'xhtml', 'tpl', 'vsd', 'ps',
    'bmp', 'ico', 'eps', 'svg', 'psd', 'ai', 'tif', 'tiff',
    'wmf', 'emf', 'ani', 'cur', 'wav', 'wave', 'mid',
    'bak', 'sql', 'csv', 'xml', 'url', 'torrent',
    'js', 'php', 'pl', 'pm', 'py', 'c', 'cpp', 'cs',
    'd', 'e', 'h', 'inc', 'java', 'm', 'asm',
    'res', 'bat', 'cmd', 'exe', 'dll', 'obj', 'sys', 'msi'
  ],

  COMPRESS_ABOVE: 4096, // static files above this size should be gzipped

};
