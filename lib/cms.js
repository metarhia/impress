'use strict';

api.cms = {};

api.cms.init = function() {
  // override this in implementation to fill with data from Db
  api.cms.db = {};        // database for content
  api.cms.languages = {}; // cashed languages keyed by char(2) code 'Sign'
  api.cms.langById = {};  // key/value (key is LanguageId, value is char(2) code 'Sign')
  api.cms.skins = {};     // cached skins keyed by skin name
  api.cms.skinById = {};  // key/value (key is SkinId, value is SkinName)
  api.cms.cache = {};     // hash keyed by Host/Language/PageName
};

api.cms.content = function(host, language, page, callback) {
  callback(null, null); // Stub, implementation is in cms.mysql.js
};
