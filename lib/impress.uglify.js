"use strict";

var uglify = impress.require('uglify-js');

if (uglify) {

  api.uglify = uglify;

  impress.minify = function(data) {
    try {
      return uglify.minify(data.toString(), { fromString: true }).code;
    } catch(e) {
      impress.log.error('js parse error\n');
    }
  };

}
