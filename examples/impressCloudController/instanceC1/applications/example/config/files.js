// Static files configuration

module.exports = {
  cacheSize: '50mb',  // memory cache size
  cacheMaxFileSize: '10mb',  // max file size to cache
  gzip: true, // default true
  preprocess: [ 'js', 'sass' ] // minify js and compile sass to css
};
