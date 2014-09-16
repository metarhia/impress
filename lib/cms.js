"use strict";

var cms = {};
api.cms = cms;

cms.init = function() {
  // override this in implementation to fill with data from Db
  cms.db = {};        // database for content
  cms.languages = {}; // cashed languages keyed by char(2) code 'Sign'
  cms.langById = {};  // key/value (key is LanguageId, value is char(2) code 'Sign')
  cms.skins = {};     // cached skins keyed by skin name
  cms.skinById = {};  // key/value (key is SkinId, value is SkinName)
  cms.cache = {};     // hash keyed by Host/Language/PageName
};

cms.content = function(host, language, page, callback) {
  callback(null, null); // Stub, implementation is in cms.mysql.js
};
