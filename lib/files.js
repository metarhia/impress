'use strict';

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const metautil = require('metautil');
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

const uploadFile = async (fileName) => {
  const dir1 = metautil.generateKey(2, metautil.DIGIT);
  const dir2 = metautil.generateKey(2, metautil.DIGIT);
  const code = metautil.generateKey(8, metautil.ALPHA_DIGIT);
  const dir = path.join(application.path, 'files', dir1, dir2);
  await fsp.mkdir(dir, { recursive: true });
  const ext = metautil.fileExt(fileName);
  const name = dir1 + dir2 + code;
  const dest = path.join(dir, name);
  const compression = COMPRESSED.includes(ext) ? 'C' : 'N';
  await fsp.rename(fileName, dest);
  const hash = await metautil.md5(dest);
  const { size } = await fs.stat(dest);
  return { name, dir, hash, size, ext, compression };
};

module.exports = Object.freeze({ uploadFile });
