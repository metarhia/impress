"use strict";

api.scss = impress.require('node-sass');
//console.dir(api.scss);

if (api.scss) {

    impress.scss = function(data) {
        try {
            return api.scss.renderSync({
                data: data
            });
        } catch(e) {
            console.dir(e);
            impress.log.error('sass: sass render error');
        }
    };

}
