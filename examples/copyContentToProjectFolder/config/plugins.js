// Plugins to be loaded using require by Impress

module.exports = [
	"db",
	"db.schema",
	"db.mongodb",
	"db.memcached",
	"db.mysql",
	"db.mysql.schema",
    "impress.log",
    "impress.security",
    "impress.security.mongodb",
	"impress.mail",
	"impress.uglify",
	//"impress.health",
	//"impress.cloud",
	"impress.geoip",
	"impress.websocket",
	"impress.sse",

	// "cms",
	// "cms.mysql"
]