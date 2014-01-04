// URL rewriting and request forwarding rules

module.exports = [
	{
		url:      "/api/(one|two)/(.*)",        // parse url using "()" as parameters, "|" as alternatives and ".*"
		rewrite:  "/example/[1].json?par1=[2]"  // rewrite url using [1]..[N] array (optional parameter)
	},
	{
		url:      "/api/(name1|name2|name3)/(.*)", // parse url using "()" as parameters, "|" as alternatives and ".*"
		rewrite:  "/api/[1]/[2]",                  // rewrite url using [1]..[N] array (optional parameter)
		host:     "example.com",                   // forward requests to specified host and port
		port:     80,
		slowTime: "1s"
	}
]