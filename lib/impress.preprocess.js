'use strict';

impress.preprocess = {};

api.sass = require('node-sass');
api.uglify = require('uglify-js');

if (api.sass) impress.preprocess.scss = function(data) {
  try {
    return api.sass.renderSync({ data: data.toString(), outputStyle: 'compressed' });
  } catch(e) {
    impress.logException(e);
  }
};

if (api.uglify) impress.preprocess.js = function(data) {
  try {
    return api.uglify.minify(data.toString(), { fromString: true }).code;
  } catch(e) {
    impress.logException(e);
  }
};
