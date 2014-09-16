// Static files configuration

module.exports = {
  minify: false,  // minify JavaScript files
  static: [ '*/css/*', '*/images/*', '*/js/*', '*/favicon.ico', '*/favicon.png' ],  // Masks for static files
  cacheSize: '50mb',  // memory cache size
  cacheMaxFileSize: '10mb',  // max file size to cache
};
