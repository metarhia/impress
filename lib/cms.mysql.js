"use strict";

// Not implemented

cms.init = cms.init.override(function() {
  this.inherited();
  api.async.series([
    function(callback) {
      cms.db.queryHash(
        'SELECT Sign,LanguageId,LanguageName,Caption,ISO FROM SystemLanguage', [],
        function(err, languages) {
          cms.languages = languages;
          var lang;
          for (var sign in languages) {
            lang = languages[sign];
            cms.langById[lang.LanguageId] = lang.Sign;
          }
          callback();
        }
      );
    },
    function(callback) {
      cms.db.queryHash(
        'SELECT SkinName,SkinId,CssVariables FROM CmsSkin', [],
        function(err, skins) {
          cms.skins = skins;
          var skin;
          for (var skinName in skins) {
            skin = skins[skinName];
            cms.skinById[skin.SkinId] = skinName;
          }
          callback();
        }
      );
    }
  ], function() {});
});

// contentItem
//   .site: { SiteId, OwnerId, SkinId, +Skin, LanguageId, +Language, DomainName, Analytics, CssBefore, CssAfter, CssVariables },
//   .prop: { SitePropId, SiteId, LanguageId, +Language, Title, Subtitle, Copyright },
//   .page: { PageId, ParentPageId, SiteId, Sequence, PageType, Visible, PubDate },
//   .content: { ContentId, SiteId, PageId, LanguageId, +Language, Priority, PageName, Caption, Subtitle, Title, Description, Keywords, Content },
//   .posts: [ PostId, PageId, LanguageId, ThreadId, PostDate, IpAddress, MessageHash, Flag, NicName, Content ]

cms.processing = function(client, callback) {
  var host = client.req.headers.host,
      path = client.path.split('/'),
      language = path[1],
      page = path[2] || '',
      lang = cms.languages[language],
      languageId = 0;
  if (language.length === 2) {
    lang = cms.languages[language];
    if (lang) languageId = lang.LanguageId;
  } else if (language.length === 0) languageId = 1;
  cms.content(host, languageId, page, function(err, data) {
    client.cachable = !!data.site && !!data.prop && !!data.content && !!data.page;
    if (data) client.context.data.cms = data;
    callback(client);
  });
};

cms.content = function(host, languageId, page, callback) {
  var contentItem = {};
  api.async.series([
    function(callback) {
      cms.db.queryRow('SELECT * FROM CmsSite where DomainName=?', [host], function(err, site) {
        contentItem.site = site;
        callback(err, null);
      });
    },
    function(callback) {
      cms.db.queryRow('SELECT * FROM CmsSiteProp where SiteId=? and LanguageId=?', [contentItem.site.SiteId, languageId], function(err, prop) {
        contentItem.prop = prop;
        callback(err, null);
      });
    },
    function(callback) {
      cms.db.queryRow('SELECT * FROM CmsContent where SiteId=? and PageName=? and LanguageId=?', [contentItem.site.SiteId, page, languageId], function(err, content) {
        contentItem.content = content;
        callback(err, null);
      });
    },
    function(callback) {
      cms.db.queryRow('SELECT * FROM CmsSitePage where PageId=?', [contentItem.content.SiteId, contentItem.content.LanguageId], function(err, page) {
        contentItem.page = page;
        callback(err, null);
      });
    }
  ], function(err) {
    if (!err) {
      var siteLanguage = cms.langById[contentItem.site.LanguageId];
      contentItem.site.Language = cms.languages[siteLanguage];

      contentItem.site.Skin = cms.skinById[contentItem.site.SkinId];

      var propLanguage = cms.langById[contentItem.prop.LanguageId];
      contentItem.prop.Language = cms.languages[propLanguage];

      var contentLanguage = cms.langById[contentItem.content.LanguageId];
      contentItem.content.Language = cms.languages[contentLanguage];

      if (callback) callback(null, contentItem);
    } else {
      if (callback) callback(err, null);
    }
  });
};
