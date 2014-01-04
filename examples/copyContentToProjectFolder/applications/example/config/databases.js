// Databases including persistent session storage and application specific

module.exports = {

	impress: {
		url: "mongodb://localhost:27017/impress", // MongoDB connection string
		slowTime: "2s",                           // time to log query as slow
		collections: ["sessions", "users", "groups"]    // Collection name for store sessions (to be removed and use introspection)
	},

	// mezha: {
	// 	url: "mysql://mezha:mezhanet@localhost/mezha", // MySQL connection example
	// 	slowTime: 1000,                                // time to log query as slow
	// 	tables: []                                     // to be implemented (to be removed and use introspection)
	// },

	// system: {
	// 	url: "mysql://impress:password@localhost/impress", // MySQL connection example
	// 	slowTime: 1000,                                // time to log query as slow
	// 	tables: []                                     // to be implemented (to be removed and use introspection)
	// },

	// Other MongoDB databases for application purposes
	// Collections to be created automatically for access like this: dbname.collname1.find(...)
	// see example:
	//
	//	dbname: {
	//		url: "mongodb://localhost:27017/dbname",
	//		collections: ["collname1", "collname2"]
	//	}
}