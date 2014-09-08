"use strict";

var config = {
	sessions: {
		characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
		length:     64
	}
};

impress.test({
	"impress.localIPs": [
		[ [], function(value) {
			return Array.isArray(value);
		} ]
	],
	"impress.generateSID": [
		[ config, function(result) {
			return result.length === 64;
		} ]
	],
	"impress.crcSID": [
		[ config, generateKey(config.sessions.length-4, config.sessions.characters), function(result) {
			return result.length === 4;
		} ]
	],
	"impress.validateSID": [
		[ config, "qOW2WqPffJolugFDxrl4uMcl5w2cwm22jAmOLwX1YcgkIAoPcT08Mo5gbEs99ea9", true ],
		[ config, "aOW2WqPffJolugFDxrl4uMcl5w2cwm22jAmOLwX1YcgkIAoPcT08Mo5gbEs99ea9", false ],
		[ config, "2XpU8oAewXwKJJSQeY0MByY403AyXprFdhB96zPFbpJxlBqHA3GfBYeLxgHxBhhZ", false ],
		[ config, "WRONG-STRING", false ],
		[ config, "", false ]
	],
	"impress.subst": [
		[ "Hello, @name@", { name:"Ali" }, "", true, "Hello, Ali" ],
		[ "Hello, @.name@", { person: { name:"Ali" } }, "person", true, "Hello, Ali" ]
	],
	"impress.dataByPath": [
		[ { item: { subitem: { value: "Gagarin" } } }, "item.subitem.value", "Gagarin" ]
	],
	"impress.htmlEscape": [
		[ "text", "text" ],
		[ "<tag>", "&lt;tag&gt;" ],
		[ "You &amp; Me", "You &amp;amp; Me" ],
		[ "You & Me", "You &amp; Me" ],
		[ "\"Quotation\"", "&quot;Quotation&quot;" ]
	],
	"impress.fileExt": [
		[ "/dir/dir/file.txt", "txt" ],
		[ "/dir/dir/file.txt", "txt" ],
		[ "\\dir\\file.txt",   "txt" ],
		[ "/dir/dir/file.txt", "txt" ],
		[ "/dir/file.txt",     "txt" ],
		[ "/dir/file.TXt",     "txt" ],
		[ "//file.txt",        "txt" ],
		[ "file.txt",          "txt" ],
		[ "/dir.ext/",         "ext" ],
		[ "/dir/",             ""    ],
		[ "/",                 ""    ],
		[ ".",                 ""    ],
		[ "",                  ""    ]
	],
	"impress.isTimeEqual": [
		[ "2014-01-01", "2014-01-01", true]
	],
	"impress.parseHost": [
		[ "",                "no-host-name-in-http-headers" ],
		[ "domain.com",      "domain.com" ],
		[ "localhost",       "localhost" ],
		[ "domain.com:8080", "domain.com" ]
	],
	"impress.arrayRegExp": [
		[ ["*"],                 "^.*$" ],
		[ ["/css/*","/folder*"], "^((\\/css\\/.*)|(\\/folder.*))$" ],
		[ ["/","/js/*"],         "^((\\/)|(\\/js\\/.*))$" ],
		[ ["/css/*.css"],        "^\\/css\\/.*\\.css$" ],
		[ ["*/css/*"],           "^.*\\/css\\/.*$" ]
	],
});