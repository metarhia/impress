'use strict';

const { node, metarhia } = require('./dependencies.js');
const application = require('./application.js');

const COMPRESSED = [
  ...['gif', 'jpg', 'jpe', 'jpeg', 'png', 'svgz', 'tiff'],
  ...['docx', 'xlsx', 'pptx', 'dotx', 'odm', 'odt', 'ott', 'odp', 'otp'],
  ...['zip', 'rar', 'z7', 'gz', 'jar', 'arj', 'tar', 'arc', 'tgz'],
  ...['iso', 'nrg', 'img', 'deb', 'dmg', 'rpm', 'apk'],
  ...['webm', 'vob', 'avi', 'mov', 'flv', 'fla', 'swf', '3gp', 'mkv'],
  ...['ogg', 'ogv', 'oga', 'ogx', 'wmv', 'wma', 'asf'],
  ...['mpg', 'mpeg', 'mpe', 'mpv', 'm2v', 'mp4', 'm4p', 'm4v'],
  ...['mp2', 'mp3', 'm4a', 'flac', 'aac', 'qma'],
  ...['djvu', 'djv'],
];

const DIR_LEN = 2;
const CODE_LEN = 8;
const { DIGIT, ALPHA_DIGIT } = metarhia.metautil;

const uploadFile = async (fileName) => {
  const dir1 = metarhia.metautil.generateKey(DIR_LEN, DIGIT);
  const dir2 = metarhia.metautil.generateKey(DIR_LEN, DIGIT);
  const code = metarhia.metautil.generateKey(CODE_LEN, ALPHA_DIGIT);
  const dir = node.path.join(application.path, 'files', dir1, dir2);
  await node.fsp.mkdir(dir, { recursive: true });
  const ext = metarhia.metautil.fileExt(fileName);
  const name = dir1 + dir2 + code;
  const dest = node.path.join(dir, name);
  const compression = COMPRESSED.includes(ext) ? 'C' : 'N';
  await node.fsp.rename(fileName, dest);
  const hash = await metarhia.metautil.md5(dest);
  const { size } = await node.fsp.stat(dest);
  return { name, dir, hash, size, ext, compression };
};

module.exports = Object.freeze({ uploadFile });
