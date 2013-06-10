![impress logo](http://habrastorage.org/storage2/c1e/1b7/190/c1e1b7190c8c6685a34d6584e936c4c9.png)

# Impress

[Impress](https://github.com/tshemsedinov/impress.git)ive totalitarian style web application framework for [node.js](http://nodejs.org).

## Installation

```bash
$ npm install impress
```

## Features

  - url routing based on file system
  - serving multiple ports, network interfaces, hosts and protocols
  - caching server-side executable JavaScript in memory
  - simple server-side templating
  - folder monitoring for server-side executable JavaScript changes and template changes
  - sessions and cookies (memory state or persistent sessions with mongoDB)
  - simple way for json-based web services development
  - serving static files with content type and streaming for media files
  - multiple instantiation strategies:
    - single instance (one process, no master and workers)
    - instance specialization (multiple processes, one master and different workers for each server)
    - multiple instances (multiple processes, one master and identical workers with no sticky)
    - ip sticky (multiple processes, one master and workers with serving sticky by IP)
  - reverse-proxy (routing request to external HTTP server with url-rewriting)
  - flexible configuration in json file
  - simple logging web requests

## Example

server.js:

```javascript
require('impress');
impress.init(function() {
	// Place here other initialization code
	// to be executed after Impress initialization
});
```

## Configuration

1. Copy project template from examples into your project folder
2. Edit config.js file in project folder
3. If you want to store persistent sessions in MongoDB, you need to run setup.js
4. Run command: node server.js

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

## License 

(The MIT License)

Copyright (c) 2012-2013 MetaSystems &lt;timur.shemsedinov@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.