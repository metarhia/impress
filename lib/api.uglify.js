'use strict';

api.uglify = impress.require('uglify-js');

if (api.uglify) {

  impress.preprocess.js = function(data) {
    try {
      return api.uglify.minify(data.toString(), { fromString: true }).code;
    } catch(e) {
      impress.logException(e);
    }
  };

}
