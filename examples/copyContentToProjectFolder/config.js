module.exports = {

	// Plugins to be loaded using require by Impress
	plugins: {
		require: [
			"db",
			"db.mongodb",
			"db.memcached",
			"db.mysql",
			"impress.mail",
			"impress.geoip"
		]
	},

	// Databases including persistent session storage and application specific
	databases: {
		impress: {
			url: "mongodb://localhost:27017/impress", // MongoDB connection string
			collections: ["sessions", "users"]                  // Collection name for store sessions
		},

		//dbname: {
		//	url: "mysql://user1:password1@localhost/database1", // MySQL connection example
		//	tables: []                                          // to be implemented
		//}

		// Other MongoDB databases for application purposes
		// Collections to be created automatically for access like this: dbname.collname1.find(...)
		// see example:
		//
		//	dbname: {
		//		url: "mongodb://localhost:27017/dbname",
		//		collections: ["collname1", "collname2"]
		//	}
	},

	// Sessions configuration
	session: {
		anonymous:  true,      // Allow anonymous sessions (client should request /api/auth/anonymous to generate SID)
		cookie:     "SID",     // Session cookie name
		characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", // Possible characters for SID
		length:     64,        // SID length in bytes
		persist:    true,      // Store sessions in persistent database
		database:   "impress"  // Database connection name to store sessions
	},

	// Server log files
	log: {
		access: "access.log", // filename or false
		error:  "error.log",  // filename or false
	},

	// Mail configuration
	mail: {
		enabled: false, // enable or disable smtp transport
		robot: "Robot name <robotname@gmail.com>",
		options: {
		    service: "Gmail",
		    auth: {
		        user: "username@gmail.com",
		        pass: "password"
		    }
		}
	},

	uglify: {
		minify: true
	},

	// Cluster configuraton
	cluster: {
		name:     "C1",   // Cluster name to identify it in loadbalancing infrastructure
		cookie:   "node", // Cookie name or false to set when session starts (value e.g. "C1"+"N1") for loadbalancing
		strategy: "multiple",
			// "single"         - one process (no master and workers)
			// "specialization" - multiple processes, one master and different workers for each server (master should not listen ports)
			// "multiple"       - multiple processes, one master and identical workers with no sticky (master should listen ports)
			// "sticky"         - multiple processes, one master and workers with sticky by IP (master should listen ports)
			//
		workers:  impress.os.cpus().length-1, // worker count, e.g. impress.os.cpus().length-1 or just number
		nagle:    false,  // Nagle algorithm
		gc:       "no"    // garbage collector period "no" for none or "1h" - 1 hour, "10m" - 10 minutes
	},

	// Bind named servers on address and port
	servers: {
		www: {
			protocol:  "http", // protocol "http" or "https" (need server.key and server.cer files)
			address:   "127.0.0.1",
			port:      80,
			static:    ["/css/*", "/images/*", "/js/*", "/favicon.ico", "/index.html"], // static definitions using wildcard "*"
			process:   "/sites/[host]",         // execute JavaScript from specified directory
			hosts:     ["localhost"]            // virtual hosts for this server (see hosts definitions below)
		},
		//static: {
		//	protocol:  "http",
		//	address:   "127.0.0.1",
		//	port:      81,
		//	static:    ["/css/*", "/images/*", "/js/*", "/favicon.ico", "/index.html"],
		//	process:   "/sites/[host]",
		//	hosts:     ["localhost"]
		//},
		//ssl: {
		//	protocol:  "https",
		//	address:   "127.0.0.1",
		//	port:      443,
		//	static:    ["/css/*", "/images/*", "/js/*", "/favicon.ico", "/index.html"],
		//	process:   "/sites/[host]",
		//	hosts:     ["localhost", "mezha"]
		//},
		//events: {
		//	protocol:  "http",
		//	address:   "127.0.0.1",
		//	port:      83,
		//	hosts:     "*",
		//	sse:       true,
		//	channels:  ["test"],
		//	heartbeat: 40000    // heartbeat delay
		//}
	},

	// Virtual hosts
	hosts: {
		localhost: {
			name:     "*",
			static:    ["/css/*", "/images/*", "/js/*", "/favicon.*"],
			process:  "/sites/localhost"
		}
	},

	// Forwarding routing rules
	routes: {
		api: {
			url:      "/api/(name1|name2|name3)/(.*)", // parse url using "()" as parameters, "|" as alternatives and ".*"
			rewrite:  "/api/[1]/[2]",                  // rewrite url using [1]..[N] array (optional parameter)
			host:     "example.com",                   // forward requests to specified host and port
			port:     80
		},
		all: {
			url:      ".*",
			host:     "example.com",
			port:     80
		}
	}

}