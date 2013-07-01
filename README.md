![impress logo](http://habrastorage.org/storage2/c1e/1b7/190/c1e1b7190c8c6685a34d6584e936c4c9.png)

# Impress

[Impress](https://github.com/tshemsedinov/impress.git)ive totalitarian style multipurpose web application server for [node.js](http://nodejs.org). All decisions are made. Ready for applied development.

The main difference from others that Impress core is monolithic and its approach is to make all in one solution with high code coupling for obligatory things and leave not obligatory to be integrated by applied developers optionally. High coupling in core gives us advantages in performance and code simplicity. For example, why we should implement static files serving or memory caching as a plugin while no one application will omit that.

## Installation

```bash
$ npm install impress
```

## Features

  - URL routing based on file system
  - can hosts multiple sites or applications on one server
    - serving multiple ports, network interfaces, hosts and protocols
    - soft configuration changes with zero downtime
  - simple server-side templating
  - caching server-side executable JavaScript and templates in memory
  - folder monitoring for server-side executable JavaScript changes and template changes
  - built-in authentication and user groups
    - sessions and cookies (memory state or persistent sessions with MongoDB)
    - template personalization for user groups
    - access modifiers for each folder in access.js files
  - simple way for json-based web services development
  - serving static files with gzipping, memory caching and filesystem watching
  - implemented SSE (Server-Sent Events) with channels and milticast
  - multiple cluster instantiation strategies:
    - single instance (one process, no master and workers)
    - instance specialization (multiple processes, one master and different workers for each server)
    - multiple instances (multiple processes, one master and identical workers with no sticky)
    - ip sticky (multiple processes, one master and workers with serving sticky by IP)
  - reverse-proxy (routing request to external HTTP server with URL-rewriting)
  - flexible configuration in json file
  - simple logging web requests
  - connection drivers for MongoDB and MySQL
  - nodemailer as a plugin for email sending

## Configuration

1. Copy project template from examples into your project folder (it contains 3 files and folder "sites" where virtual hosts are)
2. Edit config.js file in project folder (or leave it untouched if you want just to test Impress)
3. If you want to store persistent sessions in MongoDB you need this DBMS installed and you need to run "node setup.js" before starting Impress
4. Run Impress using command "node server.js"

## Handler examples and file system url mapping

1. Template example
Location: http://localhost
Base template: /sites/localhost/html.template
2. Override included "left.template"
Location: http://localhost/override
Overriden template: /sites/localhost/override/left.template
Base template: /sites/localhost/html.template
Handler: /sites/localhost/request.js
3. JSON api method example
Location: http://localhost/api/examples/methodName.json
Handler: /sites/localhost/api/examples/methodName.json/get.js
4. Start anonymous session
Location: http://localhost/api/auth/anonymousSession.json
Handler: /sites/localhost/api/auth/anonymousSession.json/get.js
5. POST request handler
Location: POST http://localhost/api/auth/regvalidation.json
Handler: /sites/localhost/api/auth/regvalidation.json/post.js
6. MongoDB access example
Location: http://localhost/api/examples/getUsers.json
Handler: /sites/localhost/api/examples/getUsers.json/get.js

## Example

Following "server.js" is stating file. Run it using command line "node server" for debud or "nohup node server" for production.
```javascript
require('impress');
impress.init(function() {
	// Place here other initialization code
	// to be executed after Impress initialization
});
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
module.exports = function(req, res, callback) {
	res.context.data = {
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
		session: JSON.stringify(impress.sessions[req.impress.session])
	};
	callback();
}
```

File "get.js": place such file in folder to be executed on GET request. For POST request "post.js", and so on.
If folder not contains "get.js" it will inherit from parent folder and so on. Example:
```javascript
module.exports = function(req, res, callback) {
	db.polltool.query('select * from City', function(err, rows, fields) {
		if (err) throw err;
		res.context.data = { rows:rows, fields:fields };
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
	<div> Field value: @field@ </div>
	<div> Include template: @[name]@ - this will include file "./name.template" </div>
	<div> This will iterate "res.context.data" from "request.js" example above:
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
  - Sergey Andriyaschenko (tblasv)

## License 

Dual licensed under the MIT or RUMI licenses.

Copyright (c) 2012-2013 MetaSystems &lt;timur.shemsedinov@gmail.com&gt;

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
