"use strict";

api.uglify = impress.require('uglify-js');

if (api.uglify) {

  impress.minify = function(data) {
    try {
      return api.uglify.minify(data.toString(), { fromString: true }).code;
    } catch(e) {
      impress.log.error('uglify: js parse error');
    }
  };

}
