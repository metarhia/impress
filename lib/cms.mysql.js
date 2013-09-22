(function(cms) {

	cms.init = cms.init.override(function(db, callback) {
		this.inherited(db);
		async.series([
			function(callback) {
				cms.db.queryHash(
					'SELECT Sign,LanguageId,LanguageName,Caption,ISO FROM SystemLanguage', [],
					function(err, languages) {
						cms.languages = languages;
						for (var sign in languages) {
							var lang = languages[sign];
							cms.langById[lang.LanguageId] = lang.Sign;
						}
						callback(null);
					}
				);
			},
			function(callback) {
				cms.db.queryHash(
					'SELECT SkinName,SkinId,CssVariables FROM CmsSkin', [],
					function(err, skins) {
						cms.skins = skins;
						for (var skinName in skins) {
							var skin = skins[skinName];
							cms.skinById[skin.SkinId] = skinName;
						}
						callback(null);
					}
				);
			}
		], callback);
	});

	// contentItem
	//   .site: { SiteId, OwnerId, SkinId, +Skin, LanguageId, +Language, DomainName, Analytics, CssBefore, CssAfter, CssVariables },
	//   .prop: { SitePropId, SiteId, LanguageId, +Language, Title, Subtitle, Copyright },
	//   .page: { PageId, ParentPageId, SiteId, Sequence, PageType, Visible, PubDate },
	//   .content: { ContentId, SiteId, PageId, LanguageId, +Language, Priority, PageName, Caption, Subtitle, Title, Description, Keywords, Content },
	//   .posts: [ PostId, PageId, LanguageId, ThreadId, PostDate, IpAddress, MessageHash, Flag, NicName, Content ]

	cms.process = function(req, res, callback) {
		var template = '',
			host = req.headers.host,
			path = req.impress.path.split('/'),
			language = path[1],
			page = req.path[2],
			lang = cms.languages[language],
			languageId = lang ? lang.LanguageId : 0,
			cacheKey = host+"/"+language+"/"+page;
		console.dor(path);
		var cacheData = cms.cache[cacheKey];
		if (cacheData) {
			if (cacheData != impress.fileNotFound) impress.end(req, res, cacheData);
			else impress.error(req, res, 404);
		} else {
			var cacheData = cms.cache[cacheKey];
			if (typeof(cacheData) == "undefined") {
				cms.content(host, languageId, page, function(cacheData) {
					cms.cache[cacheKey] = cacheData;
					impress.end(req, res, cacheData);
				});
			} else impress.end(req, res, cacheData);
		}
	}

	cms.content = function(host, language, page, callback) {
		var lang = cms.languages[language];
		if (lang) languageId = lang.LanguageId;
		var cacheKey = language+"/"+page;
		var contentItem = {};
		async.series([
			function(callback) {
				cms.db.queryRow('SELECT * FROM CmsSite where DomainName=?', [host], function(err, site) {
					contentItem.site = site;
					callback(null);
				});
			},
			function(callback) {
				cms.db.queryRow('SELECT * FROM CmsSiteProp where SiteId=? and LanguageId=?', [contentItem.site.SiteId, languageId], function(err, prop) {
					contentItem.prop = prop;
					callback(null);
				});
			},
			function(callback) {
				cms.db.queryRow('SELECT * FROM CmsContent where SiteId=? and PageName=? and LanguageId=?', [contentItem.site.SiteId, page, languageId], function(err, content) {
					contentItem.content = content;
					callback(null);
				});
			},
			function(callback) {
				cms.db.queryRow('SELECT * FROM CmsSitePage where PageId=?', [contentItem.content.SiteId, contentItem.content.LanguageId], function(err, page) {
					contentItem.page = page;
					callback(null);
				});
			}
		], function(err, results) {
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
				if (callback) callback(err, {});
			}
		});
	};

} (global.cms = global.cms || {}));