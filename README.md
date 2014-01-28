![impress logo](http://habrastorage.org/storage3/ca7/287/cd2/ca7287cd25f773d75e59a266698258a0.png)

# Impress

[Impress](https://github.com/tshemsedinov/impress.git)ive totalitarian style Multipurpose Application Server for [node.js](http://nodejs.org). All decisions are made. Solutions are scaled. Tools are provided and optimized for high load. Ready for applied development and production.

The main difference from others that Impress core is monolithic and its approach is to make all in one solution with high code coupling for obligatory things and leave not obligatory to be integrated by applied developers optionally. High coupling in core gives us advantages in performance and code simplicity. For example, why we should implement static files serving or memory caching as a plugin while no one application will omit that.

## Installation

```bash
$ npm install impress
```

## Features

  - Can serve multiple applications and sites on multiple domains
  - Serves multiple ports, network interfaces, hosts and protocols
  - Can scale on multiple servers
  - Supports application sandboxing (configuration, db and memory access isolation)
  - Supports one or multiple CPU cores with following instantiation strategies:
    - Single instance (one process)
    - Instance specialization (multiple processes, one master and different workers for each server)
    - Multiple instances (multiple processes, one master and identical workers with no sticky)
    - IP sticky (multiple processes, one master and workers with serving sticky by IP)
  - URL routing based on file system
    - Caching server-side executable JavaScript in memory
    - Filesystem watching for cache reloading when file changes on disk
  - API development support (simple way for JSON-based WEB-services development)
    - RPC-style API (Stateful, state stored in memory between requests)
    - REST-style API (Stateless, each call is separate, no state in memory)
  - Server server-side templating
    - Caching templates in memory and ready (rendered) pages optional caching
    - Value rendering with @VariableName@ syntax, absolute and relative addressing
    - Array and hash iterations with @[arrayName]@ and @[/arrayName]@ syntax
    - Including sub-templates @[includeTemplate]@ syntax
    - Template personalization for user groups
  - Config changes with zero downtime
    - Flexible configuration in JSON file
    - File watch and automatic soft reloading when config.js file changes
    - No Impress server hard restarting
  - Serving static files
    - Gzipping and HTTP request field "if-modified-since" field support and HTTP 304 "Not Modified" answer
    - Memory caching and filesystem watching for cache reloading when files changed on disk
    - JavaScript optional (configurable) minification, based on module "uglify-js" as Impress plugin
  - Built-in sessions support with authentication and user groups and anonymous sessions
    - Sessions and cookies (memory state or persistent sessions with MongoDB)
    - Access modifiers for each folder in access.js files and access inheritance
  - Implemented SSE (Server-Sent Events) with channels and multicast
  - WebSockets support (even on shared host/port with other handlers, using regular connection upgrade)
  - Reverse-proxy (routing request to external HTTP server with URL-rewriting)
  - Logging: "access", "debug", "error and "slow" logs
    - Log rotation: keep logs N days (configurable) delete files after N days
    - Log buffering, write stream flushing interval
  - Connection drivers for database engines:
    - MySQL data access layer based on felixge/mysql low-level drivers (separate module "musql-utilities")
      - MySQL Data Access Methods: queryRow, queryValue, queryCol, queryHash, queryKeyValue
      - MySQL Introspection Methods: primary, foreign, constraints, fields, databases, tables, databaseTables, tableInfo, indexes, processes, globalVariables, globalStatus, users
      - MySQL SQL Autogenerating Methods: select, insert, update, upsert, count, delete
      - Events: 'query', 'slow'
    - MongoDB drivers as Impress plugin
    - Memcached drivers as Impress plugin
    - MySQL schema generator from JSON database schemas
  - Sending Emails functionality using "nodemailer" module as Impress plugin
  - IPC support (interprocess communications) for event delivery between Node.js instances
  - Integrated DBMI (Web-based management interface for MySQL and MongoDB)
  - GeoIP support, based on "geoip-lite" module as Impress plugin (uses MaxMind database)

## Configuration

1. Install module using npm
2. Example will start automaticaly and you can see it in browser
3. Add applications to /applications and edit files in /config
4. Run Impress using command "node server.js"

## Handler examples and file system url mapping

1. Template example
Location: http://localhost
Base template: /applications/localhost/html.template
2. Override included "left.template"
Location: http://localhost/override
Overriden template: /applications/localhost/override/left.template
Base template: /applications/localhost/html.template
Handler: /applications/localhost/request.js
3. JSON api method example
Location: http://localhost/api/examples/methodName.json
Handler: /applications/localhost/api/examples/methodName.json/get.js
4. Start anonymous session
Location: http://localhost/api/auth/anonymousSession.json
Handler: /applications/localhost/api/auth/anonymousSession.json/get.js
5. POST request handler
Location: POST http://localhost/api/auth/regvalidation.json
Handler: /applications/localhost/api/auth/regvalidation.json/post.js
6. MongoDB access example
Location: http://localhost/api/examples/getUsers.json
Handler: /applications/localhost/api/examples/getUsers.json/get.js

## Example

Following "server.js" is stating file. Run it using command line "node server" for debug or "nohup node server" for production.
```javascript
require('impress');

impress.server.on("start", function() {
	// place code to be executed after all application started
});

impress.server.start();
```

File "access.js" is something line ".htaccess", you can easily define access restrictions for each folder, placing "access.js" in it.
If folder not contains "access.js" it will inherit from parent folder and so on. Example:
```javascript
module.exports = {
	guests: true, // allow requests from not logged users
	logged: true, // allow requests from logged users
	http:   true, // allow requests using http protocol
	https:  true, // allow requests using https protocol (SSL)
	groups: []    // allow access for user groups listed in array
	              // or for all if array is empty or no groups field specified
}
```

File "request.js": place such file in folder to be executed on each request (GET, POST, PUT, etc.).
If folder not contains "request.js" it will inherit from parent folder and so on. Example:
```javascript
module.exports = function(client, callback) {
	client.context.data = {
		title: "Page Title",
		users: [
			{
				name: "vasia", age: 22,
				emails: ["user1@gmail.com", "user2@gmail.com"]
			},{
				name: "dima", age: 32,
				emails: ["user3@gmail.com", "user4@gmail.com", "user5@gmail.com"]
			}
		],
		session: client.session
	};
	callback();
}
```

File "get.js": place such file in folder to be executed on GET request. For POST request "post.js", and so on.
If folder not contains "get.js" it will inherit from parent folder and so on. Example:
```javascript
module.exports = function(client, callback) {
	database1.query('select * from City', function(err, rows, fields) {
		if (err) throw err;
		client.context.data = { rows:rows, fields:fields };
		callback();
	});
}
```

File "html.template": place such file in folder as a main page template. Example:
```html
<!DOCTYPE html>
<html>
<head>
	<title>@title@</title>
</head>
<body>
	<div>
		Field value: @field@
	</div>
	<div>
		Include template: @[name]@ - this will include file "./name.template"
	</div>
	<div>
		This will iterate "res.context.data" from "request.js" example above:
		@[users]@
			<div>
				User name: @.name@<br/>
				User age: @.age@<br/>
				Email addresses:
				<ul>
					@[emails]@
						<li>@.value@</li>
					@[/emails]@
				</ul>
			</div>
		@[/users]@
	</div>
</body>
</html>
```

## Contributors

  - Timur Shemsedinov (marcusaurelius)
  - See github

## License

Dual licensed under the MIT or RUMI licenses.

Copyright (c) 2012-2014 MetaSystems &lt;timur.shemsedinov@gmail.com&gt;

License: RUMI

Do you know what you are?
You are a manuscript of a divine letter.
You are a mirror reflecting a noble face.
This universe is not outside of you.
Look inside yourself;
everything that you want,
you are already that.

Jalal ad-Din Muhammad Rumi
"Hush, Don't Say Anything to God: Passionate Poems of Rumi"
