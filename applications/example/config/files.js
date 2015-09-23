// Static files configuration

module.exports = {
  index: true, // displaye HTTP directory index for /static
  cacheSize: '50mb', // memory cache size
  cacheMaxFileSize: '10mb', // max file size to cache
  gzip: true, // default true
  preprocess: [
    // 'js', // minify js
    // 'sass' // compile sass to css
  ]
};
