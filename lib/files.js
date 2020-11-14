'use strict';

const { node, metarhia } = require('./dependencies.js');
const { fs, fsp, path, crypto, util } = node;
const { common } = metarhia;
const application = require('./application.js');

const mkdirp = util.promisify(common.nkdirp);

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

const md5 = filePath =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const file = fs.createReadStream(filePath);
    file.on('error', reject);
    hash.once('readable', () => {
      resolve(hash.read().toString('hex'));
    });
    file.pipe(hash);
  });

// Upload file to application/files
const uploadFile = async fileName => {
  const dir1 = common.generateKey(2, common.DIGIT);
  const dir2 = common.generateKey(2, common.DIGIT);
  const code = common.generateKey(8, common.ALPHA_DIGIT);
  const dir = path.join(application.path, 'files', dir1, dir2);
  await mkdirp(dir);
  const ext = common.fileExt(fileName);
  const name = dir1 + dir2 + code;
  const dest = path.join(dir, name);
  const compression = COMPRESSED.includes(ext) ? 'C' : 'N';
  await fsp.rename(fileName, dest);
  const hash = await md5(dest);
  const { size } = await fs.stat(dest);
  return { name, dir, hash, size, ext, compression };
};

module.exports = Object.freeze({ uploadFile });
