'use strict';

// SASS and JsUglify preprocessors for Impress Application Server
//
impress.preprocess = {};

api.sass = api.impress.require('node-sass');
api.uglify = api.impress.require('uglify-js');

// Load SCSS library and add it to preprocessing hash
//
if (api.sass) impress.preprocess.scss = function(data) {
  try {
    return api.sass.renderSync({ data: data.toString(), outputStyle: 'compressed' });
  } catch(err) {
    impress.logException(err);
  }
};

// Load JS minification library and add it to preprocessing hash
//
if (api.uglify) impress.preprocess.js = function(data) {
  try {
    return api.uglify.minify(data.toString(), { fromString: true }).code;
  } catch(err) {
    impress.logException(err);
  }
};
