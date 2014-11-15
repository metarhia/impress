"use strict";

api.scss = impress.require('node-sass');

if (api.scss) {

  impress.preprocess.scss = function(data) {
    try {
      return api.scss.renderSync({ data: data.toString() });
    } catch(e) {
      impress.log.error('sass: render error '+e);
    }
  };

}
