'use strict';

api.sass = impress.require('node-sass');

if (api.sass) {

  impress.preprocess.scss = function(data) {
    try {
      return api.sass.renderSync({ data: data.toString(), outputStyle: 'compressed' });
    } catch(e) {
      impress.logException(e);
    }
  };

}
