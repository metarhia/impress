# Interface: client

## class Client

HTTP Client interface for Impress Application Server

### Client.prototype.startTime

- [`<Date>`][date] client's creation time

### Client.prototype.req

- [`<http.IncomingMessage>`][http.incomingmessage]

### Client.prototype.res

- [`<http.ServerResponse>`][http.serverresponse]

### Client.prototype.websocket

- [`<Object>`][object]|[`<null>`][null] initialized while processing a websocket
  request

### Client.prototype.socket

- [`<net.Socket>`][net.socket] socket associated with the connection

### Client.prototype.server

- [`<Object>`][object] server instance

### Client.prototype.application

- [`<Application>`][application] instance of [`<Application>`][application]

### Client.prototype.dynamicHandler

- [`<boolean>`][boolean] whether client has been dispatched, default: false

### Client.prototype.query

- [`<Object>`][object] collection of key and value pairs from url query

### Client.prototype.schema

- [`<string>`][string] `https` if server's transport is `tls`, otherwise -
  `http`

### Client.prototype.method

- [`<string>`][string] the request method in lowercase

### Client.prototype.access

- [`<Object>`][object] client access options

### Client.prototype.fields

- [`<Object>`][object] parsed client data according to request content-type

### Client.prototype.files

- [`<Object>`][object] file uploads object, where the property names are field
  names and the values are arrays of file objects

### Client.prototype.slowTime

- [`<number>`][number] client slow time in milliseconds

### Client.prototype.timedOut

- [`<boolean>`][boolean] whether the client hasn't been finished before server
  timeout, default: `false`

### Client.prototype.finished

- [`<boolean>`][boolean] end response flag, default: `false`

### Client.prototype.url

- [`<string>`][string] the path portion of the request url

### Client.prototype.host

- [`<string>`][string] request host without port

### Client.prototype.path

- [`<string>`][string] the path portion of the request url with trailing slash
  at the end if there isn't one

### Client.prototype.pathDir

- [`<string>`][string] absolute path to path in request url in application's
  `www` directory (e.g. `/ias/applications/example/www/path/to/dir`)

### Client.prototype.realPath

- [`<string>`][string] path to the nearest existent folder

### Client.prototype.realPathDir

- [`<string>`][string] absolute path to the nearest existent folder in
  application's `www` directory

### Client.prototype.execPath

- [`<string>`][string] path to the nearest directory

### Client.prototype.execPathDir

- [`<string>`][string] absolute path to the nearest directory with handler
  script file for the request in application's `www` directory

### Client.prototype.ext

- [`<string>`][string] extension of file in the path portion of the request url

### Client.prototype.typeExt

- [`<string>`][string] extension type of returned data

### Client.prototype.data

- [`<string>`][string] data received from client

### Client.prototype.context

- [`<Object>`][object] client context

### Client.prototype.ip

- [`<string>`][string]|[`<undefined>`][undefined] remote IP address

### Client.prototype.cookies

- [`<Object>`][object] received cookies

### Client.prototype.preparedCookies

- [`<string[]>`][string] prepared cookies to send

### Client.prototype.ipInt

- [`<number>`][number]|[`<undefined>`][undefined] remote IP address converted to
  number, if no IP address - `undefined`

### Client.prototype.local

- [`<boolean>`][boolean] local network interface flag

### Client.prototype.session

- [`<null>`][null]|[`<Session>`][session] client session

### Client.prototype.sessionCreated

- [`<boolean>`][boolean] session creation flag, default: `false`

### Client.prototype.sessionModified

- [`<boolean>`][boolean] session modification flag, default: `false`

### Client.prototype.logged

- [`<boolean>`][boolean] whether the user is logged in, default: `false`

### Client.prototype.currentHandler

- [`<string>`][string] current handler name (e.g. `access`, `get`, `post` etc.)

### Client.prototype.constructor(application, req, res)

- `application`: [`<Application>`][application] instance of impress.Application
- `req`: [`<http.IncomingMessage>`][http.incomingmessage]
- `res`: [`<http.ServerResponse>`][http.serverresponse]

Client constructor

### Client.prototype.allowOrigin()

Specify an allowed origin.

Set `Access-Control-Allow-Origin` header if application config defines
allowOrigin, default: not set

### Client.prototype.attachment(attachmentName, size, lastModified)

- `attachmentName`: [`<string>`][string] name to save downloaded file
- `size`: [`<number>`][number] set Content-Length header, optional
- `lastModified`: [`<string>`][string] set Last-Modified header, optional

Generate HTTP file attachment

### Client.prototype.basicAuth()

Handle basic access authentication.

Check authorization base64 encoded credentials if client request contains
`Authorization` header. In case check failed or `Authorization` header has not
been set, send `401 Unauthorized` client error status response code along with
`WWW-Authenticate` header. As long as base64 is a reversible encoding, the basic
authentication is not secure, so HTTPS/TLS should be used in combination with
basic authentication for additional security.

### Client.prototype.block(msec)

- `msec`: [`<number>`][number]|[`<string>`][string] milliseconds or duration of
  client blocking

Add current client to deny list by IP and Token if session exists.

Send `403 Forbidden` client error status response code afterwards

### Client.prototype.buffer(cache)

- `cache`: [`<Object>`][object]
  - `stats`: [`<fs.Stats>`][fs.stats] instance of fs.Stats
  - `compressed`: [`<boolean>`][boolean] gzip compression flag
  - `data`: [`<Buffer>`][buffer] to send

Send static buffer and end response.

If cache was not modified `304 Not Modified` client redirection response code is
sent

### Client.prototype.cache(timeout)

- `timeout`: [`<number>`][number]|[`<string>`][string] milliseconds or duration

Cache URL response

### Client.prototype.calculateAccess()

Check whether access is allowed or not based on `client.access` options.

Default access options:
- guests, allow access for non-authenticated connections - `true`
- logged, allow access for authenticated connections - `true`
- http, allow via HTTP - `true`
- https, allow via HTTPS - `true`
- intro, allow API introspection - `false`
- virtual, allow virtual folders otherwise reply with 404 - `false`
- groups, allow access for certain groups, empty allows for all - `[]`

### Client.prototype.compress(filePath, stats)

- `filePath`: [`<string>`][string] path to handler (from application base
  directory)
- `stats`: [`<fs.Stats>`][fs.stats] instance of fs.Stats

Refresh static in memory cache with compression and minification.

If cache was not modified, `304 Not Modified` client redirection response code
is sent. If cannot read file, `404 Not Found` client error status response code
is sent

### Client.prototype.defaultContentType()

Set `Content-Type` header with an appropriate MIME type of returned data

### Client.prototype.deleteCookie(name, host)

- `name`: [`<string>`][string] cookie name
- `host`: [`<string>`][string] optional, default: client.req.headers.host

Delete cookie

### Client.prototype.detectRealPath(callback)

- `callback`: [`<Function>`][function] after path detected

Find nearest existent folder

### Client.prototype.dispatch()

Client dispatch.

Check application firewall access, in case if access is allowed parse cookies,
restore client session and process request. Otherwise following status codes can
be sent:
- `403 Forbidden` client error status response code if access denied
- `429 Too Many Requests` response status code if access limited
- `400 Bad Request` response status code in other cases

### Client.prototype.download(filePath, attachmentName, callback)

- `filePath`: [`<string>`][string] file to download
- `attachmentName`: [`<string>`][string] name to save downloaded file, optional,
  default: basename of filePath
- `callback`: [`<Function>`][function] after file downloaded

Download file generating a file attachment.

If cannot read file, `404 Not Found` client error status response code is sent

### Client.prototype.end(output)

- `output`: [`<string>`][string]|[`<Object>`][object]|[`<Buffer>`][buffer]
  - `stats`: [`<fs.Stats>`][fs.stats] instance of fs.Stats
  - `compressed`: [`<boolean>`][boolean] gzip compression flag
  - `data`: [`<Buffer>`][buffer] to send

End response

### Client.prototype.error(code, message)

- `code`: [`<number>`][number] HTTP status code
- `message`: [`<string>`][string] error message, optional

End response with HTTP error code

### Client.prototype.executeFunction(fn, callback)

- `fn`: [`<Function>`][function] to be executed
- `callback`: [`<Function>`][function]
  - `err`: [`<Error>`][error]

Execute function in client context

### Client.prototype.fileHandler(handler, inheritance, callback)

- `handler`: [`<string>`][string] handler name (e.g. `access`, `get`, `post`
  etc.)
- `inheritance`: [`<boolean>`][boolean] flag, true if called from inherited
- `callback`: [`<Function>`][function] after fileHandler executed
  - `err`: [`<Error>`][error]

Execute handler script file for the request.

Run an appropriate handler file for request method(get, post, put, delete,
patch, head) or access handler for access configuration. Files should be named
in accordance to method it handles (e.g. `get.js`)

### Client.prototype.index(indexPath)

- `indexPath`: [`<string>`][string] path to directory

Send HTML template with directory index, end response.

If in application's static files configuration `index` is set to `false`
(allowed displaying HTTP directory index for /static if true) `403 Forbidden`
client error status response code is sent

### Client.prototype.inherited(callback)

- `callback`: [`<Function>`][function] after inherited handler
  - `err`: [`<Error>`][error]

Inherit behavior from parent directory

### Client.prototype.introspect()

Send HTML template with API introspection index, end response.

Called if in client access configuration `intro` is set to `true`. If cannot
read directory by client.path, `404 Not Found` client error status response code
is sent

### Client.prototype.parseCookies()

Convert cookie string from request's headers to `client.cookies` object

_Example:_

```js
'name=value; path=/' => { name: 'value', path: '/' };
```

### Client.prototype.processing()

Process request.

If requested page is already cached, send it and end response. Otherwise check
client access and execute an appropriate handler file for request's method, end
response accordingly

### Client.prototype.processingPage()

Process HTML page by sending html template and ending response.

If cannot read template file, `500 Internal Server Error` server error response
code is sent

### Client.prototype.proxy(hostname, port, path)

- `hostname`: [`<string>`][string] forward request to host name or IP address
- `port`: [`<number>`][number] request port
- `path`: [`<string>`][string] request path

Route request to external HTTP server

### Client.prototype.redirect(location)

- `location`: [`<string>`][string] URL to redirect a page to

Redirect to specified location.

`Location` header would be set in case headers have not sent yet.

### Client.prototype.runScript(handler, fileName, callback)

- `handler`: [`<string>`][string] handler name
- `fileName`: [`<string>`][string] file name
- `callback`: [`<Function>`][function] after handler executed
  - `err`: [`<Error>`][error]

Run script in client context if access is allowed.

Configure access options if `access`. Otherwise execute function from handler
file

### Client.prototype.saveCache(data)

- `data`: [`<string>`][string]

Save cache in `client.application.cache.pages`

### Client.prototype.sendCache(cache)

- `cache`: [`<Object>`][object]
  - `expireTime`: [`<number>`][number] cache expiration time
  - `statusCode`: [`<number>`][number] response status code
  - `contentType`: [`<string>`][string] data type, `Content-Type` header
  - `contentEncoding`: [`<string>`][string] data encoding, `Content-Encoding`
    header
  - `stats`: [`<Object>`][object]
    - `size`: [`<number>`][number] data length, `Content-Length` header
    - `mtime`: [`<number>`][number]|[`<BigInt>`][bigint] last modified in
      milliseconds
    - `time`: [`<string>`][string] `Last-Modified` header
  - `data`: [`<string>`][string]

Send cache data. Set appropriate headers and end response

### Client.prototype.sendCookie()

Set all prepared cookies if headers have not been sent yet

### Client.prototype.serveStatic(relPath, onNotServed)

- `relPath`: [`<string>`][string] application relative path to file
- `onNotServed`: [`<Function>`][function] if not static

Serve static file

### Client.prototype.setCookie(name, value, host, httpOnly)

- `name`: [`<string>`][string] cookie name
- `value`: [`<string>`][string] cookie value
- `host`: [`<string>`][string] host name, optional, default:
  client.req.headers.host
- `httpOnly`: [`<boolean>`][boolean] HttpOnly cookie modifier, optional,
  default: true

Set cookie by adding it to `client.preparedCookies`

### Client.prototype.static(onNotServed)

- `onNotServed`: [`<Function>`][function] execute if file is not static

Send static file and close connection

### Client.prototype.staticCache(relPath, onNotServed)

- `relPath`: [`<string>`][string] relative path is a cash index
- `onNotServed`: [`<Function>`][function] if not served

Send static data from `client.application.cache.static`

### Client.prototype.staticFile(filePath, relPath, stats)

- `filePath`: [`<string>`][string] absolute path to file
- `relPath`: [`<string>`][string] application relative path to file
- `stats`: [`<fs.Stats>`][fs.stats] instance of fs.Stats

Send compressed static file and end response.

If the file cannot be read `404 Not Found` client error status response code is
sent

### Client.prototype.stream(filePath, stats)

- `filePath`: [`<string>`][string] absolute path to file
- `stats`: [`<fs.Stats>`][fs.stats] instance of fs.Stats

Sending file stream

### Client.prototype.template(file, callback)

- `file`: [`<string>`][string] template file name
- `callback`: [`<Function>`][function]
  - `err`: [`<Error>`][error]
  - `res`: [`<string>`][string] requested template

Render template from file or return template from cache if it exists

### Client.prototype.upload(each, callback)

- `each`: [`<Function>`][function] on processing each file
  - `err`: [`<Error>`][error]
  - `data`: [`<Object>`][object]
    - `compressionFlag`: [`<string>`][string] how file was compressed `N`(not
      compressed), `Z`(zip compressed), `G`(gzip compressed)
    - `originalName`: [`<string>`][string] filename
    - `storageName`: [`<string>`][string] generated key
    - `storagePath`: [`<string>`][string] storage path
    - `originalHash`: [`<string>`][string] hash
    - `originalSize`: [`<number>`][number] size of file in bytes
    - `storageSize`: [`<number>`][number] size of file in bytes
- `callback`: [`<Function>`][function]
  - `err`: [`<Error>`][error]
  - `count`: [`<number>`][number] amount of files

Upload file

[application]: https://github.com/metarhia/impress/blob/master/lib/application.js
[session]: https://github.com/metarhia/impress/blob/master/lib/security.js
[http.incomingmessage]: https://nodejs.org/api/http.html#http_class_http_incomingmessage
[http.serverresponse]: https://nodejs.org/api/http.html#http_class_http_serverresponse
[net.socket]: https://nodejs.org/api/net.html#net_class_net_socket
[buffer]: https://nodejs.org/api/buffer.html#buffer_class_buffer
[fs.stats]: https://nodejs.org/api/fs.html#fs_class_fs_stats
[object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[date]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
[bigint]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
[error]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
[null]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Null_type
[undefined]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Undefined_type
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type
