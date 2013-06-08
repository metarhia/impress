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
  // Place here other initialization code here to be executed after Impress initialization
});
```

## Configuration

1. Create config.js file in project folder based on included exaple
2. If you want to store persistent sessions in MongoDB, you need to run setup.js
3. Create server.js based on included exaple
4. node server.js

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
