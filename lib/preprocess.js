'use strict';

// SASS and JsUglify preprocessors for Impress Application Server

api.sass = api.registry.require('node-sass', true);
api.uglify = api.registry.require('uglify-js', true);

// Load SCSS library and add it to preprocessing hash

impress.preprocess = {};

if (api.sass) impress.preprocess.scss = data => {
  try {
    return api.sass.renderSync({
      data: data.toString(),
      outputStyle: 'compressed'
    });
  } catch (err) {
    impress.logException(err);
  }
};

// Load JS minification library and add it to preprocessing hash

if (api.uglify) impress.preprocess.js = data => {
  try {
    return api.uglify.minify(data.toString(), { fromString: true }).code;
  } catch (err) {
    impress.logException(err);
  }
};
